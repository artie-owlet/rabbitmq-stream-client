/* eslint-disable prefer-rest-params */
import { BaseMock } from './base-mock';

export class SocketMock extends BaseMock {
    private static _sock?: SocketMock;

    public static get sock(): SocketMock {
        if (!SocketMock._sock) {
            throw new Error('sock is undefined');
        }
        return SocketMock._sock;
    }

    public static clear(): void {
        SocketMock._sock = undefined;
    }

    public closed = false;

    constructor(
        public readonly onconnect: () => void,
        public readonly host: string,
        public readonly port: number,
        public readonly tls?: any,
    ) {
        super();
        SocketMock._sock = this;
    }

    public setNoDelay(): SocketMock {
        this.recordCall(arguments);
        return this;
    }

    public write(): SocketMock {
        this.recordCall(arguments);
        return this;
    }

    public end(): SocketMock {
        this.recordCall(arguments);
        setImmediate(() => {
            this.closed = true;
            this.emit('close');
        });
        return this;
    }

    public destroy(err: Error): SocketMock {
        this.recordCall(arguments);
        setImmediate(() => {
            this.closed = true;
            this.emit('error', err);
            this.emit('close');
        });
        return this;
    }
}

export function netConnect(port: number, host: string, onconnect: () => void): SocketMock {
    return new SocketMock(onconnect, host, port);
}

export function tlsConnect(port: number, host: string, tls: any, onconnect: () => void): SocketMock {
    return new SocketMock(onconnect, host, port, tls);
}
