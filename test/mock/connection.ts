/* eslint-disable prefer-rest-params */
import { BaseMock } from './base-mock';

export class ConnectionMock extends BaseMock {
    public static _conn?: ConnectionMock;

    public static get conn(): ConnectionMock {
        if (!ConnectionMock._conn) {
            throw new Error('conn is undefined');
        }
        return ConnectionMock._conn;
    }

    public static clear(): void {
        ConnectionMock._conn = undefined;
    }

    constructor(
        public readonly host: string,
        public readonly port: number,
        public readonly options: any,
    ) {
        super();
        ConnectionMock._conn = this;
    }

    public setFrameMax(): void {
        this.recordCall(arguments);
    }

    public setHeartbeat(): void {
        this.recordCall(arguments);
    }

    public sendMessage(): void {
        this.recordCall(arguments);
    }

    public close(): void {
        this.recordCall(arguments);
        setImmediate(() => this.emit('close'));
    }
}
