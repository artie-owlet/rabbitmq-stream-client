import { ClientMessage } from './client-message';

export class ClientRequest extends ClientMessage {
    constructor(key: number, version: number) {
        super(key, version);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
    }
}
