import process from 'process';

import { Commands } from './constants';
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
        if (this.isOk) {
            const size = this.reader.readArraySize();
            for (let i = 0; i < size; ++i) {
                this.properties.set(this.reader.readString(), this.reader.readString());
            }
        }
    }
}
