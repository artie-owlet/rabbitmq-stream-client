import { Commands } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class QueryPublisherRequest extends ClientRequest {
    constructor(
        private pubRef: string,
        private stream: string,
    ) {
        super(Commands.QueryPublisherSequence, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.pubRef);
        this.writeString(this.stream);
    }
}

export class QueryPublisherResponse extends ServerResponse {
    public readonly seq: bigint;

    constructor(msg: Buffer) {
        super(msg);
        this.seq = this.readUInt64();
    }
}
