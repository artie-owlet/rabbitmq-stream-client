import { Commands, RESPONSE_CODE_OK } from './constants';
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
        if (this.code === RESPONSE_CODE_OK) {
            const size = this.reader.readArraySize();
            for (let i = 0; i < size; ++i) {
                const m = this.reader.readString();
                if (m !== null) {
                    this.mechanisms.push(m);
                }
            }
        }
    }
}
