import EventEmitter from 'events';
import { connect, Socket } from 'net';
import { connect as tlsConnect, ConnectionOptions as TlsConnectionOptions, TLSSocket } from 'tls';

import { Commands } from './messages/constants';
import { ClientMessage } from './messages/client-message';

export interface IConnectionOptions {
    host: string;
    port: number;
    keepAlive?: number | false;
    noDelay?: boolean;
    tls?: TlsConnectionOptions;
}

interface IConnectionEvents {
    connect: () => void;
    message: (msg: Buffer) => void;
    close: () => void;
    error: (err: Error) => void;
}

const hbMsg = new ClientMessage(Commands.Heartbeat, 1).serialize();

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Connection {
    on<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    once<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    addListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    prependListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    prependOnceListener<E extends keyof IConnectionEvents>(event: E, listener: IConnectionEvents[E]): this;
    emit<E extends keyof IConnectionEvents>(event: E, ...params: Parameters<IConnectionEvents[E]>): boolean;
}

export class Connection extends EventEmitter {
    private sock: Socket | TLSSocket;
    private frameMax = 0;
    private heartbeatTimer: NodeJS.Timer | null = null;
    private dataReceived = false;
    private recvBuf: Buffer | null = null;

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
        this.sock.on('close', this.onClose.bind(this));
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

        this.on('message', (msg) => console.log('RECV', msg.toString('hex')));
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

    public sendMessage(msg: Buffer): void {
        console.log('SEND', msg.toString('hex'));
        if (this.frameMax > 0 && msg.length > this.frameMax) {
            throw new Error('Frame too large');
        }
        this.sock.write(msg);
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
            this.emit('message', this.recvBuf.subarray(offset, offset + 4 + msgSize));
            offset += 4 + msgSize;
        }

        if (offset === this.recvBuf.length) {
            this.recvBuf = null;
        } else {
            this.recvBuf = this.recvBuf.subarray(offset);
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
        this.emit('close');
    }
}
