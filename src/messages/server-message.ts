import { DataReader } from './data-reader';

export function parseMessageHeader(msg: Buffer): [number, number] {
    const reader = new DataReader(msg, 4);
    return [
        reader.readUInt16(),
        reader.readUInt16(),
    ];
}

export class ServerMessage extends DataReader {
    constructor(
        msg: Buffer,
    ) {
        super(msg, 8);
    }
}
