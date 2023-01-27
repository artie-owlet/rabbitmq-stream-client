import { ServerMessage } from './server-message';

export class ServerResponse extends ServerMessage {
    public readonly corrId: number;
    public readonly code: number;

    constructor(
        msg: Buffer,
    ) {
        super(msg);
        this.corrId = this.reader.readUInt32();
        this.code = this.reader.readUInt16();
    }
}
