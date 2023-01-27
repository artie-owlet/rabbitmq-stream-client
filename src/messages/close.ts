import { Commands, RESPONSE_CODE_OK } from './constants';
import { ServerRequest } from './server-request';
import { ClientMessage } from './client-message';

export class CloseRequest extends ServerRequest {
    public readonly reason: string;

    constructor(msg: Buffer) {
        super(msg);
        this.reason = this.readString();
    }
}

export class CloseResponse extends ClientMessage {
    constructor(
        private corrId: number,
    ) {
        super(Commands.Close, 1);
    }

    protected override build(): void {
        super.build();
        this.writeUInt32(this.corrId);
        this.writeUInt16(RESPONSE_CODE_OK);
    }
}
