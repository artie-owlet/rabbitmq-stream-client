import { Commands } from './constants';
import { ClientCommand } from './client-message';
import { ServerMessage } from './server-message';

export class Credit extends ClientCommand {
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
        this.code = this.readUInt16();
        this.subId = this.readUInt8();
    }
}
