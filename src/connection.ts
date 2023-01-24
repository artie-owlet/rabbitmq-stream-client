import EventEmitter from 'events';
import { connect, Socket } from 'net';
import { connect as tlsConnect, ConnectionOptions as TlsConnectionOptions, TLSSocket } from 'tls';

import { Commands, RESPONSE_FLAG } from './messages/constants';
import { Message } from './messages/message';

const hbMsg = Buffer.allocUnsafe(8);
hbMsg.writeUInt32BE(4, 0);
hbMsg.writeUInt16BE(Commands.Heartbeat, 4);
hbMsg.writeUInt16BE(1, 6);

export interface IConnectionOptions {
    host: string;
    port: number;
    keepAlive?: number | false;
    noDelay?: boolean;
    tls?: TlsConnectionOptions;
}

interface IConnectionEvents {
    connect: () => void;
    command: (key: number, version: number, msg: Buffer) => void;
    close: () => void;
    error: (err: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Connection {
    on<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    once<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    addListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    prependListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    prependOnceListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    emit<E extends keyof IConnectionEvents>(event: E, ...params: Parameters<IConnectionEvents[E]>): boolean;
}

interface IRequest {
    resolve: (msg: Buffer) => void;
    reject: (err: Error) => void;
}

export class Connection extends EventEmitter {
    private sock: Socket | TLSSocket;
    private frameMax = 0;
    private heartbeatTimer: NodeJS.Timer | null = null;
    private dataReceived = false;
    private recvBuf: Buffer | null = null;
    private corrIdCounter = 0;
    private requests = new Map<number, IRequest>();

    constructor(
        opts: IConnectionOptions,
    ) {
        super();
        
        if (opts.tls === undefined) {
            this.sock = connect(opts.port, opts.host, () => this.emit('connect'));
        } else {
            this.sock = tlsConnect(opts.port, opts.host, opts.tls, () => this.emit('connect'));
        }

        this.sock.on('data', this.onData.bind(this));
        this.sock.on('close', () => this.onClose.bind(this));
        this.sock.on('error', (err: Error) => this.emit('error', err));

        if (opts.keepAlive !== undefined) {
            if (opts.keepAlive) {
                this.sock.setKeepAlive(true, opts.keepAlive);
            } else {
                this.sock.setKeepAlive(false);
            }
        }
        if (opts.noDelay !== undefined) {
            this.sock.setNoDelay(opts.noDelay);
        }
    }

    public setFrameMax(frameMax: number): void {
        this.frameMax = frameMax;
    }

    public setHeartbeat(heartbeat: number): void {
        this.stopHeartbeat();
        if (heartbeat > 0) {
            this.heartbeatTimer = setInterval(this.onHeartbeatTimeout.bind(this), heartbeat * 1000);
        }
    }

    public sendMessage(msg: Message): void {
        const data = msg.serialize();
        if (this.frameMax > 0 && data.length > this.frameMax) {
            throw new Error('Frame too large');
        }
        this.sock.write(data);
    }

    public sendRequest(msg: Message): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const corrId = ++this.corrIdCounter;
            this.requests.set(corrId, {
                resolve,
                reject,
            });
            msg.setCorrelationId(corrId);
            this.sendMessage(msg);
        });
    }

    public close(): void {
        if (!this.sock.closed) {
            this.sock.end();
        }
        this.stopHeartbeat();
    }

    private onData(data: Buffer): void {
        this.dataReceived = true;

        if (this.recvBuf !== null) {
            this.recvBuf = Buffer.concat([this.recvBuf, data]);
        } else {
            this.recvBuf = data;
        }
        
        let offset = 0;
        while (offset < this.recvBuf.length) {
            const msgSize = this.recvBuf.readUInt32BE(offset);
            if (offset + 4 + msgSize > this.recvBuf.length) {
                break;
            }
            this.handleMessage(this.recvBuf.subarray(offset, offset + 4 + msgSize));
            offset += 4 + msgSize;
        }

        if (offset === this.recvBuf.length) {
            this.recvBuf = null;
        } else {
            this.recvBuf = this.recvBuf.subarray(offset);
        }
    }

    private handleMessage(msg: Buffer): void {
        const key = msg.readUInt16BE(4);
        if ((key & RESPONSE_FLAG) !== 0 && key !== Commands.CreditResponse) {
            const corrId = msg.readUInt32BE(8);
            const req = this.requests.get(corrId);
            if (req) {
                req.resolve(msg);
                this.requests.delete(corrId);
            } else {
                this.emit('error', new Error(`Unexpected response for command ${Commands[key]}`));
            }
        } else if (key !== Commands.Heartbeat) {
            const version = msg.readUInt16BE(6);
            this.emit('command', key, version, msg);
        }
    }

    private onHeartbeatTimeout(): void {
        if (!this.dataReceived) {
            this.emit('error', new Error('Heartbeat timeout'));
            this.close();
            return;
        }
        this.dataReceived = false;
        this.sock.write(hbMsg);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private onClose(): void {
        this.stopHeartbeat();

        this.requests.forEach((req) => {
            req.reject(new Error('Connection closed'));
        });
        this.requests.clear();

        this.emit('close');
    }
}
