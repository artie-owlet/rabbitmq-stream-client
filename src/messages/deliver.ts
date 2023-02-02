import { ServerMessage } from './server-message';
import { crc32 } from './crc32';
import { DataReader } from './data-reader';
import { decodeGzip } from './gzip';

export enum CompressionTypes {
    None = 0,
    Gzip = 1,
    Snappy = 2,
    Lz4 = 3,
    Zstd = 4,
}

const decoders = new Map([
    [CompressionTypes.Gzip, decodeGzip],
]);

export function installDecoder(cmpType: number, decode: (input: Buffer) => Promise<Buffer>): void {
    decoders.set(cmpType, decode);
}

class DeliverParseError extends Error {
    constructor(reason: string) {
        super(`Failed to parse Deliver: ${reason}`);
    }
}

export class Deliver extends ServerMessage {
    public readonly subId: number;
    public readonly committedChunkId: number;
    public readonly timestamp: bigint;
    public readonly offsetValue: bigint;

    private numEntries: number;
    private records: Buffer[];
    private checksum: number;
    private dataLength: number;

    constructor(
        private msg: Buffer,
        version: 1 | 2,
        disableCrcCheck: boolean,
    ) {
        super(msg);
        this.subId = this.readUInt8();
        this.committedChunkId = version === 1 ? 0 : this.readUInt32();
        this.shift(1); // MagicVersion
        const chunkType = this.readUInt8();
        if (chunkType !== 0) {
            throw new DeliverParseError(`invalid chunk type ${chunkType}`);
        }
        this.numEntries = this.readUInt16();
        this.records = new Array<Buffer>(this.readUInt32());
        this.timestamp = this.readInt64();
        this.shift(8); // Epoch
        this.offsetValue = this.readUInt64();
        this.checksum = this.readUInt32();
        this.dataLength = this.readUInt32();
        this.shift(8); // TrailerLength, Reserved

        if (!disableCrcCheck) {
            if (!this.checkCrc()) {
                throw new Error('Failed to parse Deliver: wrong checksum');
            }
        }
    }

    public async parseData(): Promise<Buffer[]> {
        const uncmpJobs = [] as Promise<void>[];
        let recId = 0;
        for (let i = 0; i < this.numEntries; ++i) {
            const entryType = this.readUInt8();
            if ((entryType & 0x80) === 0) {
                this.unshift(1);
                this.records[recId] = this.readBytes();
                ++recId;
            } else {
                const cmpType = (entryType & 0x70) >> 4;
                const recordsInBatch = this.readUInt16();
                this.shift(4); // Uncompressed Length
                const data = this.readBytes();
                if (cmpType === CompressionTypes.None) {
                    this.readSubEntries(data, recId, recordsInBatch);
                } else {
                    const decode = decoders.get(cmpType);
                    if (!decode) {
                        throw new DeliverParseError(`compression type ${cmpType} not supported`);
                    }
                    uncmpJobs.push(this.readCmpSubEntries(decode, data, recId, recordsInBatch));
                }
                recId += recordsInBatch;
            }
        }
        if (uncmpJobs.length > 0) {
            await Promise.all(uncmpJobs);
        }
        return this.records;
    }

    private async readCmpSubEntries(
        uncompress: (input: Buffer) => Promise<Buffer>,
        data: Buffer,
        startRecordId: number,
        recordsInBatch: number,
    ): Promise<void> {
        const uncmpData = await uncompress(data);
        this.readSubEntries(uncmpData, startRecordId, recordsInBatch);
    }

    private readSubEntries(data: Buffer, startRecordId: number, recordsInBatch: number): void {
        const reader = new DataReader(data, 0);
        for (let i = startRecordId; i < recordsInBatch; ++i) {
            this.records[i] = reader.readBytes();
        }
    }

    private checkCrc(): boolean {
        const data = this.msg.subarray(this.getOffset(), this.getOffset() + this.dataLength);
        return crc32(data) === this.checksum;
    }
}
