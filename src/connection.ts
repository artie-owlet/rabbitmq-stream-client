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

    public sendMessage(key: number, version: number, corrId: number | null, data: Buffer): void {
        const corrIdSize = corrId === null ? 0 : 4;
        const header = Buffer.allocUnsafe(8 + corrIdSize);
        const msgSize = data.length + 4 + corrIdSize;
        header.writeUInt32BE(msgSize, 0);
        header.writeUInt16BE(key, 4);
        header.writeUInt16BE(version, 6);
        if (corrId !== null) {
            header.writeUInt32BE(corrId, 8);
        }
        this.sock.write(Buffer.concat([header, data]));
    }

    private onData(data: Buffer): void {
        if (this.recvBuf !== null) {
            this.recvBuf = Buffer.concat([this.recvBuf, data]);
        } else {
            this.recvBuf = data;
        }
        let offset = 0;
        
    }
}
