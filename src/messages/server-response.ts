import { DataReader } from './data-reader';

export function parseResponseHeader(msg: Buffer): [number, number] {
    const reader = new DataReader(msg, 8);
    return [
        reader.readUInt32(),
        reader.readUInt16(),
    ];
}

export class ServerResponse extends DataReader {
    constructor(
        msg: Buffer,
    ) {
        super(msg, 16);
    }
}
