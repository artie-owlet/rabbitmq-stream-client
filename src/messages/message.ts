import { DataWriter } from './data-writer';

enum Types {
    Int8,
    Int16,
    Int32,
    Int64,
    UInt8,
    UInt16,
    UInt32,
    UInt64,
    Bytes,
    String,
}

type IntField = [Types.Int8 | Types.Int16 | Types.Int32 | Types.UInt8 | Types.UInt16 | Types.UInt32, number];
type BigIntField = [Types.Int64 | Types.UInt64, bigint];
type BytesField = [Types.Bytes, Buffer | null];
type StringField = [Types.String, string | null];

export class Message {
    private size = 4;
    private fields = [] as (IntField | BigIntField | BytesField | StringField)[];
    private corrId?: number;

    constructor(
        private key: number,
        private version: number,
    ) {
    }

    public setCorrelationId(corrId: number): void {
        this.corrId = corrId;
    }

    public serialize(): Buffer {
        const msg = Buffer.allocUnsafe(this.size);
        const dw = new DataWriter(msg);
        dw.writeUInt32(this.size);
        dw.writeUInt16(this.key);
        dw.writeUInt16(this.version);
        if (this.corrId !== undefined) {
            dw.writeUInt32(this.corrId);
        }
        this.fields.forEach(([t, val]) => {
            switch (t) {
                case Types.Int8:
                    return dw.writeInt8(val);
                case Types.Int16:
                    return dw.writeInt16(val);
                case Types.Int32:
                    return dw.writeInt32(val);
                case Types.Int64:
                    return dw.writeInt64(val);
                case Types.UInt8:
                    return dw.writeUInt8(val);
                case Types.UInt16:
                    return dw.writeUInt16(val);
                case Types.UInt32:
                    return dw.writeUInt32(val);
                case Types.UInt64:
                    return dw.writeUInt64(val);
                case Types.Bytes:
                    return dw.writeBytes(val);
                case Types.String:
                    return dw.writeString(val);
            }
        });
        return msg;
    }

    public writeInt8(n: number): void {
        this.size += 1;
        this.fields.push([Types.Int8, n]);
    }

    public writeInt16(n: number): void {
        this.size += 2;
        this.fields.push([Types.Int16, n]);
    }

    public writeInt32(n: number): void {
        this.size += 4;
        this.fields.push([Types.Int32, n]);
    }

    public writeInt64(n: bigint): void {
        this.size += 8;
        this.fields.push([Types.Int64, n]);
    }

    public writeUInt8(n: number): void {
        this.size += 1;
        this.fields.push([Types.UInt8, n]);
    }

    public writeUInt16(n: number): void {
        this.size += 2;
        this.fields.push([Types.UInt16, n]);
    }

    public writeUInt32(n: number): void {
        this.size += 4;
        this.fields.push([Types.UInt32, n]);
    }

    public writeUInt64(n: bigint): void {
        this.size += 8;
        this.fields.push([Types.UInt64, n]);
    }

    public writeBytes(bytes: Buffer | null): void {
        this.size += 4 + (bytes !== null ? bytes.length : 0);
        this.fields.push([Types.Bytes, bytes]);
    }

    public writeString(str: string | null): void {
        this.size += 2 + (str !== null ? Buffer.byteLength(str) : 0);
        this.fields.push([Types.String, str]);
    }
}
