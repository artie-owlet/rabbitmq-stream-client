import { RESPONSE_CODE_OK } from './constants';
import { ServerMessage } from './server-message';

export class ServerResponse extends ServerMessage {
    public readonly corrId: number;
    public readonly code: number;
    public readonly isOk: boolean;

    constructor(
        msg: Buffer,
    ) {
        super(msg);
        this.corrId = this.reader.readUInt32();
        this.code = this.reader.readUInt16();
        this.isOk = this.code === RESPONSE_CODE_OK;
    }
}
