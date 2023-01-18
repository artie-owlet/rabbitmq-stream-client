import EventEmitter from 'events';
import { connect, Socket } from 'net';
import { connect as tlsConnect, ConnectionOptions as TlsConnectionOptions, TLSSocket } from 'tls';

export interface IConnectionOptions {
    host: string;
    port: number;
    keepAlive?: number | false;
    noDelay?: boolean;
    timeout?: number;
    tls?: TlsConnectionOptions;
}

export class Connection extends EventEmitter {
    private sock: Socket | TLSSocket;
    private recvBuf: Buffer | null = null;
    private frameMax = 0;
    private heartbeatTimer: NodeJS.Timer | null = null;
    private isAlive = false;

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
        this.sock.on('close', () => this.emit('close'));
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
        if (opts.timeout !== undefined) {
            this.sock.setTimeout(opts.timeout, () => this.emit('error', new Error('socket timeout')));
        }
    }

    public setFrameMax(frameMax: number): void {
        this.frameMax = frameMax;
    }

    public setHeartbeat(heartbeat: number): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (heartbeat > 0) {
            this.heartbeatTimer = setInterval(this.onHeartbeatTimeout.bind(this), heartbeat * 1000);
        }
    }

    public sendMessage(key: number, version: number, corrId: number | null, data: Buffer): void {
        const corrIdSize = corrId === null ? 0 : 4;
        const header = Buffer.allocUnsafe(8 + corrIdSize);
        const msgSize = data.length + 4 + corrIdSize;
        if (this.frameMax > 0 && header.length + msgSize > this.frameMax) {
            throw new Error('frame too large');
        }
        header.writeUInt32BE(msgSize, 0);
        header.writeUInt16BE(key, 4);
        header.writeUInt16BE(version, 6);
        if (corrId !== null) {
            header.writeUInt32BE(corrId, 8);
        }
        this.sock.write(Buffer.concat([header, data]));
    }

    public close(): void {
        this.sock.end();
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private onData(data: Buffer): void {
        this.isAlive = true;

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
            this.emit('message', this.recvBuf.subarray(offset + 4, offset + 4 + msgSize));
            offset += 4 + msgSize;
        }

        if (offset === this.recvBuf.length) {
            this.recvBuf = null;
        } else {
            this.recvBuf = this.recvBuf.subarray(offset);
        }
    }

    private onHeartbeatTimeout(): void {
        if (!this.isAlive) {
        }
    }
}
