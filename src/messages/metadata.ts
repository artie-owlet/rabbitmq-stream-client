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
        if (this.isOk) {
            const bSize = this.reader.readArraySize();
            for (let i = 0; i < bSize; ++i) {
                this.brokers.set(this.reader.readUInt16(), {
                    host: this.reader.readString(),
                    port: this.reader.readUInt32(),
                });
            }
            const smSize = this.reader.readArraySize();
            for (let i = 0; i < smSize; ++i) {
                const stream = this.reader.readString();
                const code = this.reader.readUInt16();
                const leaderRef = this.reader.readUInt16();
                const size = this.reader.readArraySize();
                const replicasRefs = [] as number[];
                for (let j = 0; j < size; ++j) {
                    replicasRefs.push(this.reader.readUInt16());
                }
                this.streamsMetadata.set(stream, {
                    code,
                    leaderRef,
                    replicasRefs,
                });
            }
        }
    }
}
