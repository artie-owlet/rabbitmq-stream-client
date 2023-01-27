import { Commands } from './constants';
import { ClientMessage } from './client-message';

export class Unsubscribe extends ClientMessage {
    constructor(
        private subId: number,
    ) {
        super(Commands.Unsubscribe, 1);
    }

    protected override build(): void {
        super.build();
        this.writeUInt8(this.subId);
    }
}
