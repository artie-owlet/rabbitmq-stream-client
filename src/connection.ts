import EventEmitter from 'events';
import { connect, Socket } from 'net';
import { connect as tlsConnect, ConnectionOptions as TlsConnectionOptions, TLSSocket } from 'tls';

import { Commands } from './constants';

const hbMsg = Buffer.allocUnsafe(8);
hbMsg.writeUInt32BE(4, 0);
hbMsg.writeUInt16BE(Commands.Heartbeat, 4);
hbMsg.writeUInt16BE(1, 6);

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
    private dataReceived = false;

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
            this.sock.setTimeout(opts.timeout, this.onSocketTimeout.bind(this));
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
        if (!this.dataReceived) {
            this.emit('error', new Error('heartbeat timeout'));
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

    private onSocketTimeout(): void {
        this.emit('error', new Error('socket timeout'));
        this.close();
    }
}
