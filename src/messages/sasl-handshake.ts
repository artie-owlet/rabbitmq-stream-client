import { Commands } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class SaslHandshakeRequest extends ClientRequest {
    constructor() {
        super(Commands.SaslHandshake, 1);
    }
}

export class SaslHandshakeResponse extends ServerResponse {
    public readonly mechanisms: string[] = [];

    constructor(msg: Buffer) {
        super(msg);
        if (this.isOk) {
            const size = this.reader.readArraySize();
            for (let i = 0; i < size; ++i) {
                this.mechanisms.push(this.reader.readString());
            }
        }
    }
}
