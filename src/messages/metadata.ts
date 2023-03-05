import { Commands, RESPONSE_CODE_OK } from './constants';
import { ClientRequest } from './client-message';
import { DataReader } from './data-reader';

export class MetadataRequest extends ClientRequest {
    constructor(
        private streams: string[],
    ) {
        super(Commands.Metadata, 1);
    }

    protected override build(corrId: number): void {
        super.build(corrId);
        this.writeArraySize(this.streams.length);
        this.streams.forEach((s) => this.writeString(s));
    }
}

interface IBroker {
    host: string;
    port: number;
}

export interface IStreamMetadata {
    leader: IBroker;
    replicas: IBroker[];
}

export class MetadataResponse extends DataReader {
    public readonly streamsMetadata = new Map<string, IStreamMetadata>();

    constructor(msg: Buffer) {
        super(msg, 12);

        const bSize = this.readArraySize();
        const brokers = new Map<number, IBroker>();
        for (let i = 0; i < bSize; ++i) {
            brokers.set(this.readUInt16(), {
                host: this.readString(),
                port: this.readUInt32(),
            });
        }

        const smSize = this.readArraySize();
        for (let i = 0; i < smSize; ++i) {
            const stream = this.readString();
            const code = this.readUInt16();
            if (code !== RESPONSE_CODE_OK) {
                this.shift(6);
                continue;
            }

            const leader = brokers.get(this.readUInt16());
            if (!leader) {
                throw new Error('Failed to parse Metadata response');
            }

            const size = this.readArraySize();
            const replicas = [] as IBroker[];
            for (let j = 0; j < size; ++j) {
                const broker = brokers.get(this.readUInt16());
                if (broker) {
                    replicas.push(broker);
                }
            }

            this.streamsMetadata.set(stream, {
                leader,
                replicas,
            });
        }
    }

    public static getCorrelationId(msg: Buffer): number {
        return new DataReader(msg, 8).readUInt32();
    }
}
