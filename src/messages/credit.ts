import { Commands } from './constants';
import { ClientMessage } from './client-message';
import { ServerMessage } from './server-message';

export class Credit extends ClientMessage {
    constructor(
        private subId: number,
        private credit: number,
    ) {
        super(Commands.Credit, 1);
    }

    protected override build(): void {
        super.build();
        this.writeUInt8(this.subId);
        this.writeUInt16(this.credit);
    }
}

export class CreditResponse extends ServerMessage {
    public readonly code: number;
    public readonly subId: number;

    constructor(msg: Buffer) {
        super(msg);
        this.code = this.reader.readUInt16();
        this.subId = this.reader.readUInt8();
    }
}
