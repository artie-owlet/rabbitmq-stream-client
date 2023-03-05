import { Commands } from './constants';
import { ClientCommand } from './client-message';

export class StoreOffset extends ClientCommand {
    constructor(
        private ref: string,
        private stream: string,
        private offsetValue: bigint,
    ) {
        super(Commands.StoreOffset, 1);
    }

    protected override build(): void {
        super.build();
        this.writeString(this.ref);
        this.writeString(this.stream);
        this.writeUInt64(this.offsetValue);
    }
}
