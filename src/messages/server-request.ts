import { ServerMessage } from './server-message';

export class ServerRequest extends ServerMessage {
    public readonly corrId: number;

    constructor(
        msg: Buffer,
    ) {
        super(msg);
        this.corrId = this.readUInt32();
    }
}
