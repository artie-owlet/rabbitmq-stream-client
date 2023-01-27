import { ServerMessage } from './server-message';

export class ServerRequest extends ServerMessage {
    public readonly corrId: number;

    constructor(
        public readonly key: number,
        public readonly version: number,
        msg: Buffer,
    ) {
        super(msg);
        this.corrId = this.reader.readUInt32();
    }
}
