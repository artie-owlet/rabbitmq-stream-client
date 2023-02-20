import EventEmitter from 'events';

import { Connection, IConnectionOptions } from './connection';
import { Commands, MAX_CORRELATION_ID, RESPONSE_CODE_OK, RESPONSE_FLAG } from './messages/constants';
import { Offset } from './messages/offset';
import { ClientMessage } from './messages/client-message';
import { ClientRequest } from './messages/client-request';
import { parseMessageHeader } from './messages/server-message';
import { parseResponseHeader } from './messages/server-response';
import { DeclarePublisherRequest } from './messages/declare-publisher';
import { Publish } from './messages/publish';
import { PublishConfirm } from './messages/publish-confirm';
import { PublishError, IPublishingError } from './messages/publish-error';
import { QueryPublisherRequest, QueryPublisherResponse } from './messages/query-publisher';
import { DeletePublisherRequest } from './messages/delete-publisher';
import { SubscribeRequest } from './messages/subscribe';
import { Deliver } from './messages/deliver';
import { Credit, CreditResponse } from './messages/credit';
import { StoreOffset } from './messages/store-offset';
import { QueryOffsetRequest, QueryOffsetResponse } from './messages/query-offset';
import { UnsubscribeRequest } from './messages/unsubscribe';
import { CreateRequest } from './messages/create';
import { DeleteRequest } from './messages/delete';
import { MetadataRequest, MetadataResponse, IStreamMetadata } from './messages/metadata';
import { MetadataUpdate } from './messages/metadata-update';
import { PeerPropertiesRequest, PeerPropertiesResponse } from './messages/peer-properties';
import { SaslHandshakeRequest, SaslHandshakeResponse } from './messages/sasl-handshake';
import {
    PlainSaslAuthenticateRequest,
    ExternalSaslAuthenticateRequest,
} from './messages/sasl-authenticate';
import { ServerTune, ClientTune } from './messages/tune';
import { OpenRequest, OpenResponse } from './messages/open';
import { CloseRequest, CloseResponse } from './messages/close';
import { RouteRequest, RouteResponse } from './messages/route';
import { PartitionsRequest, PartitionsResponse } from './messages/partitions';
import {
    ConsumerUpdateRequest,
    ConsumerUpdateResponseOk,
    ConsumerUpdateResponseNoStream,
} from './messages/consumer-update';
import {
    CommandVersionsExchangeRequest,
    CommandVersionsExchangeResponse,
    ICommandVersion,
} from './messages/command-versions-exchange';
import { StreamStatsRequest, StreamStatsResponse } from './messages/stream-stats';
import { printResponse } from './print-response';
import { PromiseQueue } from './promise-queue';

export interface IClientOptions extends IConnectionOptions {
    username?: string;
    password?: string;
    vhost: string;
    frameMax?: number;
    heartbeat?: number;
    requestTimeout?: number;
    connectionName?: string;
    disableDeliverCrcCheck?: boolean;
}

class UnsupportedVersionError extends Error {}

interface IRequest {
    key: number;
    version: number;
    ts: number;
    resolve: (resp: Buffer) => void;
    reject: (err: Error) => void;
}

export interface IConsumerUpdateResolver {
    response: (offset: Offset) => void;
    reject: () => void;
}

export interface IDeliverInfo {
    subId: number;
    committedChunkId: number;
    timestamp: bigint;
    offsetValue: bigint;
}

function hex(n: number): string {
    return n.toString(16).padStart(4, '0');
}

const DEFAULT_REQUEST_TIMEOUT = 10;

interface IClientEvents {
    open: () => void;
    publishConfirm: (pubId: number, msgIds: bigint[]) => void;
    publishError: (pubId: number, errors: IPublishingError[]) => void;
    deliver: (info: IDeliverInfo, messages: Buffer[]) => void;
    creditError: (subId: number, code: number) => void;
    metadataUpdate: (stream: string, code: number) => void;
    consumerUpdate: (res: IConsumerUpdateResolver) => void;
    close: (reason: string) => void;
    error: (err: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Client {
    on<E extends keyof IClientEvents>(event: E, listener: IClientEvents[E]): this;
    once<E extends keyof IClientEvents>(event: E, listener: IClientEvents[E]): this;
    addListener<E extends keyof IClientEvents>(event: E, listener: IClientEvents[E]): this;
    prependListener<E extends keyof IClientEvents>(event: E, listener: IClientEvents[E]): this;
    prependOnceListener<E extends keyof IClientEvents>(event: E, listener: IClientEvents[E]): this;
    emit<E extends keyof IClientEvents>(event: E, ...params: Parameters<IClientEvents[E]>): boolean;
}

export class Client extends EventEmitter {
    public static async createClient(host: string, port: number, options: IClientOptions): Promise<Client> {
        return new Promise((res, rej) => {
            let lastErr: Error | null = null;
            const cli = new Client(host, port, options);
            cli.on('error', (err) => lastErr = err);
            cli.once('open', () => res(cli));
            cli.once('close', (reason) => rej(lastErr === null ? new Error(`Connection closed: ${reason}`) : lastErr ));
        });
    }

    public serverProperties = new Map<string, string>();

    private frameMax: number;
    private heartbeat: number;
    private requestTimeoutMs: number;

    private conn: Connection;
    private corrIdCounter = 0;
    private requests = new Map<number, IRequest>();
    private reqTimer: NodeJS.Timer;
    private tuneTimer: NodeJS.Timer | null = null;
    private closeReason = '';
    private deliverQueues = new Map<number, PromiseQueue<[IDeliverInfo, Buffer[]]>>;

    constructor(
        private host: string,
        private port: number,
        private options: IClientOptions,
    ) {
        super();
        this.frameMax = options.frameMax || 0;
        this.heartbeat = options.heartbeat || 0;
        this.requestTimeoutMs = (options.requestTimeout || DEFAULT_REQUEST_TIMEOUT) * 1000;
        this.reqTimer = setInterval(this.onRequestTimeout.bind(this), this.requestTimeoutMs / 10);

        this.conn = new Connection(this.host, this.port, this.options);
        this.conn.on('connect', this.onConnect.bind(this));
        this.conn.on('message', this.onMessage.bind(this));
        this.conn.on('close', this.onClose.bind(this));
        this.conn.on('error', (err: Error) => this.emit('error', err));
    }

    public async declarePublisher(pubId: number, pubRef: string, stream: string): Promise<void> {
        await this.sendRequest(new DeclarePublisherRequest(pubId, pubRef, stream));
    }

    public publish(pubId: number, msgId: bigint, msg: Buffer): void;
    public publish(pubId: number, msgs: [bigint, Buffer][]): void;
    public publish(pubId: number, ...args: any[]): void {
        const cmd = new Publish(pubId);
        if (typeof args[0] === 'bigint') {
            cmd.addMessage(args[0], args[1] as Buffer);
        } else {
            (args as [bigint, Buffer][]).forEach(([id, msg]) => {
                cmd.addMessage(id, msg);
            });
        }
        this.sendMessage(cmd);
    }

    public async queryPublisherSequence(pubRef: string, stream: string): Promise<bigint> {
        const res = new QueryPublisherResponse(await this.sendRequest(new QueryPublisherRequest(pubRef, stream)));
        return res.seq;
    }

    public async deletePublisher(pubId: number): Promise<void> {
        await this.sendRequest(new DeletePublisherRequest(pubId));
    }

    public async subscribe(subId: number, stream: string, offset: Offset, credit: number,
        properties: Map<string, string>): Promise<void> {
        await this.sendRequest(new SubscribeRequest(subId, stream, offset, credit, properties));
    }

    public credit(subId: number, credit: number): void {
        this.sendMessage(new Credit(subId, credit));
    }

    public storeOffset(ref: string, stream: string, offsetValue: bigint): void {
        this.sendMessage(new StoreOffset(ref, stream, offsetValue));
    }

    public async queryOffset(ref: string, stream: string): Promise<bigint> {
        const res = new QueryOffsetResponse(await this.sendRequest(new QueryOffsetRequest(ref, stream)));
        return res.offsetValue;
    }

    public async unsubscribe(subId: number): Promise<void> {
        await this.sendRequest(new UnsubscribeRequest(subId));
    }

    public async create(stream: string, args: Map<string, string>): Promise<void> {
        await this.sendRequest(new CreateRequest(stream, args));
    }

    public async delete(stream: string): Promise<void> {
        await this.sendRequest(new DeleteRequest(stream));
    }

    public async metadata(streams: string[]): Promise<Map<string, IStreamMetadata>> {
        const res = new MetadataResponse(await this.sendRequest(new MetadataRequest(streams)));
        return res.streamsMetadata;
    }

    public async route(routingKey: string, superStream: string): Promise<string[]> {
        const res = new RouteResponse(await this.sendRequest(new RouteRequest(routingKey, superStream)));
        return res.streams;
    }

    public async partitions(superStream: string): Promise<string[]> {
        const res = new PartitionsResponse(await this.sendRequest(new PartitionsRequest(superStream)));
        return res.streams;
    }

    public async exchangeCommandVersion(): Promise<ICommandVersion[]> {
        const res = new CommandVersionsExchangeResponse(
            await this.sendRequest(new CommandVersionsExchangeRequest())
        );
        return res.commands;
    }

    public async streamStats(stream: string): Promise<Map<string, bigint>> {
        const res = new StreamStatsResponse(await this.sendRequest(new StreamStatsRequest(stream)));
        return res.stats;
    }

    public close(): void {
        this.conn.close();
    }

    private async onConnect(): Promise<void> {
        try {
            await this.peerPropertiesExchange();
            await this.authenticate();
            this.tuneTimer = setTimeout(() => {
                this.emit('error', new Error('Tune timeout'));
                this.close();
            }, this.requestTimeoutMs);
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
            this.close();
        }
    }

    private async peerPropertiesExchange(): Promise<void> {
        const props = new PeerPropertiesResponse(
            await this.sendRequest(new PeerPropertiesRequest(this.options.connectionName)));
        this.serverProperties = props.properties;
    }

    private async authenticate(): Promise<void> {
        const handshake = new SaslHandshakeResponse(await this.sendRequest(new SaslHandshakeRequest()));

        let req: ClientRequest;
        if (this.options.username !== undefined) {
            if (!handshake.mechanisms.includes('PLAIN')) {
                throw new Error(
                    'Authentication failed: username provided but server does not support PLAIN authentication'
                );
            }
            req = new PlainSaslAuthenticateRequest(this.options.username, this.options.password || '');
        } else {
            if (!handshake.mechanisms.includes('EXTERNAL')) {
                throw new Error(
                    'Authentication failed: no username provided and server does not support EXTERNAL authentication'
                );
            }
            req = new ExternalSaslAuthenticateRequest();
        }
        await this.sendRequest(req);
    }

    private async sendRequest(req: ClientRequest): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (this.corrIdCounter === MAX_CORRELATION_ID) {
                this.corrIdCounter = 0;
            }
            const corrId = ++this.corrIdCounter;
            this.requests.set(corrId, {
                key: req.key,
                version: req.version,
                ts: Date.now(),
                resolve,
                reject,
            });
            this.conn.sendMessage(req.serialize(corrId));
        });
    }

    private sendMessage(msg: ClientMessage): void {
        this.conn.sendMessage(msg.serialize());
    }

    private onMessage(msg: Buffer): void {
        const [key, version] = parseMessageHeader(msg);
        if ((key & RESPONSE_FLAG) !== 0 &&
            key !== Commands.CreditResponse &&
            key !== Commands.MetadataResponse) {
            this.onResponse(key & (0xFFFF ^ RESPONSE_FLAG), version, msg);
        } else if (key !== Commands.Heartbeat) {
            this.onCommand(key, version, msg);
        }
    }

    private onResponse(key: number, version: number, msg: Buffer): void {
        try {
            const [corrId, code] = parseResponseHeader(msg);
            const req = this.requests.get(corrId);
            if (req) {
                if (req.key !== key || req.version !== version) {
                    throw new Error('Response key or version mismatch');
                }
                if (code === RESPONSE_CODE_OK) {
                    req.resolve(msg);
                } else {
                    req.reject(new Error(`${Commands[key]} failed: ${printResponse(code)}`));
                }
                this.requests.delete(corrId);
            } else {
                throw new Error(`Unexpected response for command ${Commands[key]}`);
            }
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
    }

    private onCommand(key: number, version: number, msg: Buffer): void {
        try {
            switch (key) {
                case Commands.PublishConfirm:
                    return this.onPublishConfirm(version, msg);
                case Commands.PublishError:
                    return this.onPublishError(version, msg);
                case Commands.Deliver:
                    return this.onDeliver(version, msg);
                case Commands.CreditResponse:
                    return this.onCreditResponse(version, msg);
                case Commands.MetadataResponse:
                    return this.onMetadataResponse(version, msg);
                case Commands.MetadataUpdate:
                    return this.onMetadataUpdate(version, msg);
                case Commands.Tune:
                    return this.onTune(version, msg);
                case Commands.Close:
                    return this.onServerClose(version, msg);
                case Commands.ConsumerUpdate:
                    return this.onConsumerUpdate(version, msg);
                default:
                    throw new Error(`Unknown server command, key=${hex(key)}`);
            }
        } catch (err) {
            if (err instanceof UnsupportedVersionError) {
                this.emit('error', new Error(`Unsupported version ${version} for command ${Commands[key]}`));
            } else {
                this.emit('error', err instanceof Error ? err : new Error(String(err)));
            }
        }
    }

    private onPublishConfirm(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const conf = new PublishConfirm(msg);
        this.emit('publishConfirm', conf.pubId, conf.msgIds);
    }

    private onPublishError(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const err = new PublishError(msg);
        this.emit('publishError', err.pubId, err.errors);
    }

    private onDeliver(version: number, msg: Buffer): void {
        if (version !== 1 && version !== 2) {
            throw new UnsupportedVersionError();
        }

        const deliver = new Deliver(msg, version, this.options.disableDeliverCrcCheck || false);
        const queue = this.getDeliverQueue(deliver.subId);
        queue.push((async () => {
            const messages = await deliver.parseData();
            return [{
                subId: deliver.subId,
                committedChunkId: deliver.committedChunkId,
                timestamp: deliver.timestamp,
                offsetValue: deliver.offsetValue,
            }, messages];
        })());
        this.credit(deliver.subId, 1);
    }

    private getDeliverQueue(subId: number): PromiseQueue<[IDeliverInfo, Buffer[]]> {
        let queue = this.deliverQueues.get(subId);
        if (queue) {
            return queue;
        }

        queue = new PromiseQueue<[IDeliverInfo, Buffer[]]>();
        queue.on('ready', ([info, messages]) => this.emit('deliver', info, messages));
        queue.on('error', (err) => this.emit('error', new Error(`Failed to parse Deliver: ${err.message}`)));
        this.deliverQueues.set(subId, queue);
        return queue;
    }

    private onCreditResponse(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const res = new CreditResponse(msg);
        if (res.code !== RESPONSE_CODE_OK) {
            this.emit('creditError', res.subId, res.code);
        }
    }

    private onMetadataResponse(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const corrId = MetadataResponse.getCorrelationId(msg);
        const req = this.requests.get(corrId);
        if (req) {
            req.resolve(msg);
            this.requests.delete(corrId);
        } else {
            throw new Error('Unexpected response for command Metadata');
        }
    }

    private onMetadataUpdate(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const upd = new MetadataUpdate(msg);
        this.emit('metadataUpdate', upd.stream, upd.code);
    }

    private onTune(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        if (this.tuneTimer !== null) {
            clearTimeout(this.tuneTimer);
            this.tuneTimer = null;
        }

        const serverTune = new ServerTune(msg);
        const frameMax = (this.frameMax === 0 || serverTune.frameMax === 0) ?
            Math.max(this.frameMax, serverTune.frameMax) : Math.min(this.frameMax, serverTune.frameMax);
        const heartbeat = (this.heartbeat === 0 || serverTune.heartbeat === 0) ?
            Math.max(this.heartbeat, serverTune.heartbeat) : Math.min(this.heartbeat, serverTune.heartbeat);
        this.conn.setFrameMax(frameMax);
        this.conn.setHeartbeat(heartbeat);
        this.sendMessage(new ClientTune(frameMax, heartbeat));
    
        void this.open();
    }

    private async open(): Promise<void> {
        try {
            const res = new OpenResponse(await this.sendRequest(new OpenRequest(this.options.vhost)));
            res.properties.forEach((value, key) => this.serverProperties.set(key, value));
            this.emit('open');
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
            this.close();
        }
    }

    private onServerClose(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const closeReq = new CloseRequest(msg);
        this.closeReason = closeReq.reason;
        this.sendMessage(new CloseResponse(closeReq.corrId));
        this.close();
    }

    private onConsumerUpdate(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const req = new ConsumerUpdateRequest(msg);
        this.emit('consumerUpdate', {
            response: (offset: Offset) => {
                this.sendMessage(new ConsumerUpdateResponseOk(req.corrId, offset));
            },
            reject: () => {
                this.sendMessage(new ConsumerUpdateResponseNoStream(req.corrId));
            }
        });
    }

    private onClose(): void {
        this.requests.forEach((req) => {
            req.reject(new Error('Connection closed'));
        });
        clearInterval(this.reqTimer);
        this.emit('close', this.closeReason);
    }

    private onRequestTimeout(): void {
        const now = Date.now();
        this.requests.forEach((req, id) => {
            if (now - req.ts > this.requestTimeoutMs) {
                req.reject(new Error('Request timeout'));
                this.requests.delete(id);
            }
        });
    }
}
