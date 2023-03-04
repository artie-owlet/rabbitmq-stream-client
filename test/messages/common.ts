import { DataWriter } from '../../src/messages/data-writer';
import { RESPONSE_FLAG } from '../../src/messages/constants';

export function writeHeader(dw: DataWriter, key: number, version: number): void {
    dw.writeUInt32(dw.data.length - 4);
    dw.writeUInt16(key);
    dw.writeUInt16(version);
}

export function writeRequestHeader(dw: DataWriter, key: number, version: number, corrId: number): void {
    writeHeader(dw, key, version);
    dw.writeUInt32(corrId);
}

export function writeResponseHeader(
    dw: DataWriter,
    key: number,
    version: number,
    corrId: number,
    respCode: number,
): void {
    writeHeader(dw, key & RESPONSE_FLAG, version);
    dw.writeUInt32(corrId);
    dw.writeUInt16(respCode);
}
