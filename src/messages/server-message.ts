import { DataReader } from './data-reader';

export function parseMessageHeader(msg: Buffer): [number, number] {
    const reader = new DataReader(msg, 4);
    return [
        reader.readUInt16(),
        reader.readUInt16(),
    ];
}

export class ServerMessage {
    protected reader: DataReader;

    constructor(
        msg: Buffer,
    ) {
        this.reader = new DataReader(msg, 8);
    }
}
