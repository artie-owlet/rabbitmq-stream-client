import { ServerMessage } from './server-message';

export class PublishConfirm extends ServerMessage {
    public readonly pubId: number;
    public readonly msgIds = [] as bigint[];

    constructor(msg: Buffer) {
        super(msg);
        this.pubId = this.reader.readUInt8();
        const size = this.reader.readArraySize();
        for (let i = 0; i < size; ++i) {
            this.msgIds.push(this.reader.readUInt64());
        }
    }
}
