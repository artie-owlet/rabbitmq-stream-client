export class DataReader {
    constructor(
        private data: Buffer,
        private offset: number,
    ) {
    }

    public readInt8(): number {
        const n = this.data.readInt8(this.offset);
        this.offset += 1;
        return n;
    }

    public readInt16(): number {
        const n = this.data.readInt16BE(this.offset);
        this.offset += 2;
        return n;
    }

    public readInt32(): number {
        const n = this.data.readInt32BE(this.offset);
        this.offset += 4;
        return n;
    }

    public readInt64(): bigint {
        const n = this.data.readBigInt64BE(this.offset);
        this.offset += 8;
        return n;
    }

    public readUInt8(): number {
        const n = this.data.readUInt8(this.offset);
        this.offset += 1;
        return n;
    }

    public readUInt16(): number {
        const n = this.data.readUInt16BE(this.offset);
        this.offset += 2;
        return n;
    }

    public readUInt32(): number {
        const n = this.data.readUInt32BE(this.offset);
        this.offset += 4;
        return n;
    }

    public readUInt64(): bigint {
        const n = this.data.readBigUInt64BE(this.offset);
        this.offset += 8;
        return n;
    }

    public readBytes(): Buffer {
        const size = this.readInt32();
        if (size < 0) {
            return Buffer.from('');
        }
        const bytes = this.data.subarray(this.offset, this.offset + size);
        this.offset += size;
        return bytes;
    }

    public readString(): string {
        const size = this.readInt16();
        if (size < 0) {
            return '';
        }
        const str = this.data.toString('utf8', this.offset, this.offset + size);
        this.offset += size;
        return str;
    }

    public readArraySize(): number {
        return this.readInt32();
    }
}
