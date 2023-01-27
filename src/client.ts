import EventEmitter from 'events';

import { Connection, IConnectionOptions } from './connection';
import { Commands, MAX_CORRELATION_ID, RESPONSE_FLAG } from './messages/constants';
import { ClientMessage } from './messages/client-message';
import { ClientRequest } from './messages/client-request';
import { parseMessageHeader } from './messages/server-message';
import { ServerResponse } from './messages/server-response';
import { PeerPropertiesRequest, PeerPropertiesResponse } from './messages/peer-properties';
import { SaslHandshakeRequest, SaslHandshakeResponse } from './messages/sasl-handshake';
import {
    PlainSaslAuthenticateRequest,
    ExternalSaslAuthenticateRequest,
} from './messages/sasl-authenticate';
import { ServerTune, ClientTune } from './messages/tune';
import { OpenRequest, OpenResponse } from './messages/open';
import { CloseRequest, CloseResponse } from './messages/close';
import { printResponse } from './print-response';

export interface IClientOptions extends IConnectionOptions {
    username?: string;
    password?: string;
    vhost: string;
    frameMax?: number;
    heartbeat?: number;
    requestTimeout?: number;
    reconnectTimeoutMs: number;
    connectionName?: string;
}

class UnsupportedVersionError extends Error {}

interface IRequest {
    key: number;
    version: number;
    ts: number;
    resolve: (resp: ServerResponse) => void;
    reject: (err: Error) => void;
}

const DEFAULT_REQUEST_TIMEOUT = 10;

export class Client extends EventEmitter {
    private frameMax: number;
    private heartbeat: number;
    private requestTimeoutMs: number;

    private conn: Connection | null = null;
    private isClosed = false;
    private corrIdCounter = 0;
    private requests = new Map<number, IRequest>();
    private reqTimer: NodeJS.Timer;
    private serverProperties = new Map<string, string>();
    private closeReason = '';

    constructor(
        private options: IClientOptions,
    ) {
        super();
        this.frameMax = options.frameMax || 0;
        this.heartbeat = options.heartbeat || 0;
        this.requestTimeoutMs = (options.requestTimeout || DEFAULT_REQUEST_TIMEOUT) * 1000;
        this.reqTimer = setInterval(this.onRequestTimeout.bind(this), this.requestTimeoutMs / 10);
        this.connect();
    }

    public close(): void {
        this.isClosed = true;
        clearInterval(this.reqTimer);
        if (this.conn) {
            this.conn.close();
        }
    }

    private connect(): void {
        if (this.isClosed) {
            return;
        }

        this.conn = new Connection(this.options);
        this.conn.on('connect', this.onConnect.bind(this));
        this.conn.on('message', this.onMessage.bind(this));
        this.conn.on('close', this.onClose.bind(this));
        this.conn.on('error', (err: Error) => this.emit('error', err));
        this.closeReason = '';
    }

    private async onConnect(): Promise<void> {
        try {
            await this.peerPropertiesExchange();
            await this.authenticate();
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
    }

    private async peerPropertiesExchange(): Promise<void> {
        const props = (await this.sendRequest(new PeerPropertiesRequest(this.options.connectionName))
        ) as PeerPropertiesResponse;
        if (!props.isOk) {
            throw new Error(`PeerProperties failed: ${printResponse(props.code)}`);
        }
        this.serverProperties = props.properties;
    }

    private async authenticate(): Promise<void> {
        const handshake = (await this.sendRequest(new SaslHandshakeRequest())) as SaslHandshakeResponse;
        if (!handshake.isOk) {
            throw new Error(`SaslHandshake failed: ${printResponse(handshake.code)}`);
        }

        let req: ClientRequest;
        if (this.options.username !== undefined) {
            if (!handshake.mechanisms.includes('PLAIN')) {
                throw new Error(
                    'Authentication failed: username provided but server does not support PLAIN authentication');
            }
            req = new PlainSaslAuthenticateRequest(this.options.username, this.options.password || '');
        } else {
            if (!handshake.mechanisms.includes('EXTERNAL')) {
                throw new Error(
                    'Authentication failed: no username provided and server does not support EXTERNAL authentication');
            }
            req = new ExternalSaslAuthenticateRequest();
        }
        const auth = await this.sendRequest(req);
        if (!auth.isOk) {
            throw new Error(`SaslAuthenticate failed: ${printResponse(auth.code)}`);
        }
    }

    private sendRequest(req: ClientRequest): Promise<ServerResponse> {
        return new Promise((resolve, reject) => {
            if (this.conn === null) {
                throw new Error('Client not connected');
            }
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
        if (this.conn === null) {
            throw new Error('Client not connected');
        }
        this.conn.sendMessage(msg.serialize());
    }

    private onMessage(msg: Buffer): void {
        const [key, version] = parseMessageHeader(msg);
        if ((key & RESPONSE_FLAG) !== 0 && key !== Commands.CreditResponse) {
            this.onResponse(key & (0xFFFF ^ RESPONSE_FLAG), version, msg);
        } else if (key !== Commands.Heartbeat) {
            this.onCommand(key, version, msg);
        }
    }

    private onResponse(key: number, version: number, msg: Buffer): void {
        try {
            const resp = this.parseServerResponse(key, version, msg);
            const req = this.requests.get(resp.corrId);
            if (req) {
                if (req.key !== key || req.version !== version) {
                    throw new Error('Response key or version mismatch');
                }
                req.resolve(resp);
                this.requests.delete(resp.corrId);
            } else {
                throw new Error(`Unexpected response for command ${Commands[key]}`);
            }
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
    }

    private parseServerResponse(key: number, _/*version*/: number, msg: Buffer): ServerResponse {
        switch (key) {
            case Commands.DeclarePublisher:
            case Commands.DeletePublisher:
            case Commands.Unsubscribe:
            case Commands.Create:
            case Commands.Delete:
            case Commands.SaslAuthenticate:
            case Commands.Close:
                return new ServerResponse(msg);
            // case Commands.QueryPublisherSequence:
            //     return new (msg);
            // case Commands.Subscribe:
            //     return new (msg);
            // case Commands.QueryOffset:
            //     return new (msg);
            // case Commands.Metadata:
            //     return new (msg);
            case Commands.PeerProperties:
                return new PeerPropertiesResponse(msg);
            case Commands.SaslHandshake:
                return new SaslHandshakeResponse(msg);
            case Commands.Open:
                return new OpenResponse(msg);
            // case Commands.Route:
            //     return new (msg);
            // case Commands.Partitions:
            //     return new (msg);
            // case Commands.ExchangeCommandVersions:
            //     return new (msg);
            // case Commands.StreamStats:
            //     return new (msg);
            default:
                throw new Error(`Unknown server response, key=${key}`);
        }
    }

    private onCommand(key: number, version: number, msg: Buffer): void {
        try {
            switch (key) {
                // case Commands.PublishConfirm:
                //     return this.onPublishConfirm(version, msg);
                // case Commands.PublishError:
                //     return this.onPublishError(version, msg);
                // case Commands.Deliver:
                //     return this.onDeliver(version, msg);
                // case Commands.CreditResponse:
                //     return this.onCreditResponse(version, msg);
                // case Commands.MetadataUpdate:
                //     return this.onMetadataUpdate(version, msg);
                case Commands.Tune:
                    return this.onTune(version, msg);
                case Commands.Close:
                    return this.onServerClose(version, msg);
                // case Commands.ConsumerUpdate:
                //     return this.onConsumerUpdate(version, msg);
                default:
                    throw new Error(`Unknown server command, key=${key}`);
            }
        } catch (err) {
            if (err instanceof UnsupportedVersionError) {
                this.emit('error', new Error(`Unsupported version ${version} for command ${Commands[key]}`));
            } else {
                this.emit('error', err instanceof Error ? err : new Error(String(err)));
            }
        }
    }

    // private onPublishConfirm(version: number, msg: Buffer): void {
    //     if (version !== 1) {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    // private onPublishError(version: number, msg: Buffer): void {
    //     if (version !== 1) {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    // private onDeliver(version: number, msg: Buffer): void {
    //     if (version === 1) {
    //         this.onDeliverV1(data);
    //     } else if (version === 2) {
    //         this.onDeliverV2(data);
    //     } else {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    // private onDeliverV1(msg: Buffer): void {
    // }

    // private onDeliverV2(msg: Buffer): void {
    // }

    // private onCreditResponse(version: number, msg: Buffer): void {
    //     if (version !== 1) {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    // private onMetadataUpdate(version: number, msg: Buffer): void {
    //     if (version !== 1) {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    private onTune(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const serverTune = new ServerTune(msg);
        const frameMax = (this.frameMax === 0 || serverTune.frameMax === 0) ?
            Math.max(this.frameMax, serverTune.frameMax) : Math.min(this.frameMax, serverTune.frameMax);
        const heartbeat = (this.heartbeat === 0 || serverTune.heartbeat === 0) ?
            Math.max(this.heartbeat, serverTune.heartbeat) : Math.min(this.heartbeat, serverTune.heartbeat);
        this.tune(frameMax, heartbeat);

        void this.open();
    }

    private tune(frameMax: number, heartbeat: number): void {
        if (this.conn === null) {
            return;
        }
        this.conn.setFrameMax(frameMax);
        this.conn.setHeartbeat(heartbeat);
        this.sendMessage(new ClientTune(frameMax, heartbeat));
    }

    private async open(): Promise<void> {
        try {
            const res = (await this.sendRequest(new OpenRequest(this.options.vhost))) as OpenResponse;
            if (!res.isOk) {
                throw new Error(`Open failed: ${printResponse(res.code)}`);
            }
            this.emit('open', res.properties, this.serverProperties);
        } catch (err) {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
    }

    private onServerClose(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }

        const closeReq = new CloseRequest(msg);
        this.closeReason = closeReq.reason;
        this.sendMessage(new CloseResponse(closeReq.corrId));
        if (this.conn !== null) {
            this.conn.close();
        }
    }

    // private onConsumerUpdate(version: number, msg: Buffer): void {
    //     if (version !== 1) {
    //         throw new UnsupportedVersionError();
    //     }
    // }

    private onClose(): void {
        this.requests.forEach((req) => {
            req.reject(new Error('Connection closed'));
        });
        this.requests.clear();
        this.corrIdCounter = 0;
        this.conn = null;
        this.emit('close', this.closeReason);

        if (!this.isClosed) {
            setTimeout(this.connect.bind(this), this.options.reconnectTimeoutMs);
        }
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
