import { Commands } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class RouteRequest extends ClientRequest {
    constructor(
        private routingKey: string,
        private superStream: string,
    ) {
        super(Commands.Route, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.routingKey);
        this.writeString(this.superStream);
    }
}

export class RouteResponse extends ServerResponse {
    // public readonly stream: string;

    constructor(msg: Buffer) {
        super(msg);
    }
}
