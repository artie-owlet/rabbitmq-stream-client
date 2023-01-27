import { Commands } from './constants';
import { ClientRequest } from './client-request';

export class PlainSaslAuthenticateRequest extends ClientRequest {
    constructor(
        private username: string,
        private password: string,
    ) {
        super(Commands.SaslAuthenticate, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString('PLAIN');
        this.writeBytes(Buffer.from(`\0${this.username}\0${this.password}`));
    }
}

export class ExternalSaslAuthenticateRequest extends ClientRequest {
    constructor() {
        super(Commands.SaslAuthenticate, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString('EXTERNAL');
    }
}
