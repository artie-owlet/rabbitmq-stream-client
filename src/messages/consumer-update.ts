import { Commands, RESPONSE_CODE_OK } from './constants';
import { ServerRequest } from './server-message';
import { ClientResponse } from './client-message';
import { Offset, OffsetTypes } from './offset';

export class ConsumerUpdateRequest extends ServerRequest {
    public readonly subId: number;
    public readonly active: boolean;

    constructor(msg: Buffer) {
        super(msg);
        this.subId = this.readUInt8();
        this.active = this.readUInt8() === 0 ? false : true;
    }
}

export class ConsumerUpdateResponseOk extends ClientResponse {
    constructor(
        corrId: number,
        private offset: Offset,
    ) {
        super(Commands.ConsumerUpdate, 1, corrId, RESPONSE_CODE_OK);
    }

    protected override build(): void {
        super.build();
        this.writeUInt16(this.offset.type);
        if (this.offset.type === OffsetTypes.Offset) {
            this.writeUInt64(this.offset.value);
        } else if (this.offset.type === OffsetTypes.Timestamp) {
            this.writeInt64(this.offset.value);
        }
    }
}

export class ConsumerUpdateResponseNoStream extends ClientResponse {
    constructor(
        corrId: number,
    ) {
        super(Commands.ConsumerUpdate, 1, corrId, 0x02);
    }
}
