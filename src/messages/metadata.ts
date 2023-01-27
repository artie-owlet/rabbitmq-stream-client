import { Commands } from './constants';
import { ClientRequest } from './client-request';
import { ServerResponse } from './server-response';

export class MetadataRequest extends ClientRequest {
    constructor(
        private stream: string,
    ) {
        super(Commands.Metadata, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeString(this.stream);
    }
}

export interface IBroker {
    host: string;
    port: number;
}

export interface IStreamMetadata {
    code: number;
    leaderRef: number;
    replicasRefs: number[];
}

export class MetadataResponse extends ServerResponse {
    public readonly brokers = new Map<number, IBroker>();
    public readonly streamsMetadata = new Map<string, IStreamMetadata>();

    constructor(msg: Buffer) {
        super(msg);

        const bSize = this.readArraySize();
        for (let i = 0; i < bSize; ++i) {
            this.brokers.set(this.readUInt16(), {
                host: this.readString(),
                port: this.readUInt32(),
            });
        }

        const smSize = this.readArraySize();
        for (let i = 0; i < smSize; ++i) {
            const stream = this.readString();
            const code = this.readUInt16();
            const leaderRef = this.readUInt16();
            const size = this.readArraySize();
            const replicasRefs = [] as number[];
            for (let j = 0; j < size; ++j) {
                replicasRefs.push(this.readUInt16());
            }
            this.streamsMetadata.set(stream, {
                code,
                leaderRef,
                replicasRefs,
            });
        }
    }
}
