import { RESPONSE_FLAG } from './constants';
import { ClientMessage } from './client-message';

export class ClientResponse extends ClientMessage {
    constructor(
        key: number,
        version: number,
        private corrId: number,
        private code: number,
    ) {
        super(key & RESPONSE_FLAG, version);
    }

    protected override build(): void {
        super.build();
        this.writeUInt32(this.corrId);
        this.writeUInt16(this.code);
    }
}
