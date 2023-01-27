import { Commands, RESPONSE_CODE_OK } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class OpenRequest extends ClientRequest {
    constructor(
        private vhost: string,
    ) {
        super(Commands.Open, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.vhost);
    }
}

export class OpenResponse extends ServerResponse {
    public properties = new Map<string, string>();

    constructor(msg: Buffer) {
        super(msg);
        if (this.code === RESPONSE_CODE_OK) {
            const size = this.reader.readArraySize();
            for (let i = 0; i < size; ++i) {
                const key = this.reader.readString();
                const value = this.reader.readString();
                if (key !== null && value !== null) {
                    this.properties.set(key, value);
                }
            }
        }
    }
}
