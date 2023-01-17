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

export interface IResponse {
    version: number;
    code: number;
    data: Buffer;
}

export class Connection extends EventEmitter {
    private sock: Socket | TLSSocket;

    constructor(
        opts: IConnectionOptions,
    ) {
        super();
        
        if (opts.tls === undefined) {
            this.sock = connect(opts.port, opts.host, () => this.emit('connect'));
        } else {
            this.sock = tlsConnect(opts.port, opts.host, opts.tls, () => this.emit('connect'));
        }
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
}
