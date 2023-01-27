import { ClientMessage } from './client-message';
import { ServerRequest } from './server-request';

export class ClientResponse extends ClientMessage {
    public readonly corrId: number;

    constructor(
        req: ServerRequest,
        public readonly code: number,
    ) {
        super(req.key, req.version);
        this.corrId = req.corrId;
    }

    protected override build(): void {
        super.build(this.corrId);
        this.writeUInt16(this.code);
    }
}
