import { Commands } from './constants';
import { ClientMessage } from './client-message';

export class Publish extends ClientMessage {
    private msgs = [] as [bigint, Buffer][];

    constructor(
        private pubId: number,
    ) {
        super(Commands.Publish, 1);
    }

    public addMessage(id: bigint, msg: Buffer): void {
        this.msgs.push([id, msg]);
    }

    protected override build(): void {
        super.build();
        this.writeUInt8(this.pubId);
        this.writeArraySize(this.msgs.length);
        this.msgs.forEach(([id, msg]) => {
            this.writeUInt64(id);
            this.writeBytes(msg);
        });
    }
}
