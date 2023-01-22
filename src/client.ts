import EventEmitter from 'events';

import { Connection, IConnectionOptions } from './connection';
import { Commands } from './messages/constants';

export interface IClientOptions extends IConnectionOptions {
    username?: string;
    password?: string;
    heartbeat?: number;
}

class UnsupportedVersionError extends Error {}

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
        this.conn.on('connect', this.onConnect.bind(this));
        this.conn.on('command', this.onCommand.bind(this));
        this.conn.on('close', this.onClose.bind(this));
        this.conn.on('error', (err: Error) => this.emit('error', err));
    }

    private onConnect(): void {
    }

    private onCommand(key: number, version: number, msg: Buffer): void {
        try {
            switch (key) {
                case Commands.PublishConfirm:
                    return this.onPublishConfirm(version, msg);
                case Commands.PublishError:
                    return this.onPublishError(version, msg);
                case Commands.Deliver:
                    return this.onDeliver(version, msg);
                case Commands.CreditResponse:
                    return this.onCreditResponse(version, msg);
                case Commands.MetadataUpdate:
                    return this.onMetadataUpdate(version, msg);
                case Commands.Tune:
                    return this.onTune(version, msg);
                case Commands.Close:
                    return this.onServerClose(version, msg);
                case Commands.ConsumerUpdate:
                    return this.onConsumerUpdate(version, msg);
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

    private onPublishConfirm(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onPublishError(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onDeliver(version: number, msg: Buffer): void {
        if (version === 1) {
            this.onDeliverV1(data);
        } else if (version === 2) {
            this.onDeliverV2(data);
        } else {
            throw new UnsupportedVersionError();
        }
    }

    private onDeliverV1(msg: Buffer): void {
    }

    private onDeliverV2(msg: Buffer): void {
    }

    private onCreditResponse(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onMetadataUpdate(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onTune(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onServerClose(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onConsumerUpdate(version: number, msg: Buffer): void {
        if (version !== 1) {
            throw new UnsupportedVersionError();
        }
    }

    private onClose(): void {
    }
}
