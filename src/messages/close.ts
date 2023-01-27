import { Commands } from './constants';
import { ServerRequest } from './server-request';

export class CloseRequest extends ServerRequest {
    public readonly reason: string;

    constructor(msg: Buffer) {
        super(Commands.Close, 1, msg);
        this.reason = this.reader.readString() || '';
    }
}
