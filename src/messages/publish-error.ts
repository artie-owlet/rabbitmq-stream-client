import { ServerMessage } from './server-message';

export interface IPublishingError {
    id: bigint;
    code: number;
}

export class PublishError extends ServerMessage {
    public readonly pubId: number;
    public readonly errors = [] as IPublishingError[];

    constructor(msg: Buffer) {
        super(msg);
        this.pubId = this.reader.readUInt8();
        const size = this.reader.readArraySize();
        for (let i = 0; i < size; ++i) {
            const id = this.reader.readUInt64();
            const code = this.reader.readUInt16();
            this.errors.push({
                id,
                code,
            });
        }
    }
}
