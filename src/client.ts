import EventEmitter from 'events';

import { Connection, IConnectionOptions } from './connection';

export interface IClientOptions extends IConnectionOptions {
    username?: string;
    password?: string;
    heartbeat?: number;
}

export class Client extends EventEmitter {
    private conn: Connection | null = null;
    private connOpts: IClientOptions;
    private username?: string;
    private password: string;
    private heartbeat: number;

    constructor(
        opts: IClientOptions,
    ) {
        super();
        this.connOpts = opts;
        this.username = opts.username;
        this.password = opts.password || '';
        this.heartbeat = opts.heartbeat || 0;
    }

    private connect(): void {
        this.conn = new Connection(this.connOpts);
        // this.conn
    }
}
