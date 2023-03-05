import { Commands } from './constants';
import { ClientRequest } from './client-message';

export class DeclarePublisherRequest extends ClientRequest {
    constructor(
        private pubId: number,
        private pubRef: string,
        private stream: string,
    ) {
        super(Commands.DeclarePublisher, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeUInt8(this.pubId);
        this.writeString(this.pubRef);
        this.writeString(this.stream);
    }
}
