import { Commands, OffsetTypes } from './constants';
import { ClientRequest } from './client-request';

export class SubscribeRequest extends ClientRequest {
    constructor(
        private subId: number,
        private stream: string,
        private offsetType: OffsetTypes,
        private offset: bigint,
        private credit: number,
        private properties: Map<string, string>,
    ) {
        super(Commands.Subscribe, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeUInt8(this.subId);
        this.writeString(this.stream);
        this.writeUInt16(this.offsetType);
        if (this.offsetType === OffsetTypes.Offset) {
            this.writeUInt64(this.offset);
        } else if (this.offsetType === OffsetTypes.Timestamp) {
            this.writeInt64(this.offset);
        }
        this.writeUInt16(this.credit);
        this.writeArraySize(this.properties.size);
        this.properties.forEach((value, key) => {
            this.writeString(key);
            this.writeString(value);
        });
    }
}
