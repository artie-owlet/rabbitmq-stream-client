import { Commands } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class QueryOffsetRequest extends ClientRequest {
    constructor(
        private ref: string,
        private stream: string,
    ) {
        super(Commands.QueryOffset, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.ref);
        this.writeString(this.stream);
    }
}

export class QueryOffsetResponse extends ServerResponse {
    public readonly offset: bigint;

    constructor(msg: Buffer) {
        super(msg);
        this.offset = this.readUInt64();
    }
}
