import process from 'process';

import { Commands, RESPONSE_CODE_OK } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class PeerPropertiesRequest extends ClientRequest {
    private props = new Map([
        ['product', '@artie-owlet/rabbitmq-stream-client'],
        ['version', process.env['npm_package_version'] || ''],
        ['platform', `Node.js ${process.version}`]
    ]);

    constructor(connectionName?: string) {
        super(Commands.PeerProperties, 1);
        if (connectionName !== undefined) {
            this.props.set('connection_name', connectionName);
        }
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeArraySize(this.props.size);
        this.props.forEach((value, key) => {
            this.writeString(key);
            this.writeString(value);
        });
    }
}

export class PeerPropertiesResponse extends ServerResponse {
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
