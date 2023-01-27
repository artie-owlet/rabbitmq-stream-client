import { Commands } from './constants';
import { ClientRequest } from './client-request';

export class DeleteRequest extends ClientRequest {
    constructor(
        private stream: string,
    ) {
        super(Commands.Delete, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.stream);
    }
}
