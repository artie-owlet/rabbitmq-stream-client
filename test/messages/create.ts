import { DataWriter } from '../../src/messages/data-writer';
import { Commands } from '../../src/messages/constants';

import { writeRequestHeader, testClientRequest } from './common';

import { CreateRequest } from '../../src/messages/create';

const TEST_STREAM = 'test-stream';
const TEST_ARGS = new Map([
    ['key1', 'value1'],
    ['key2', 'value2'],
]);

function request(): Buffer {
    let msgLen = 12 + 2 + TEST_STREAM.length + 4;
    TEST_ARGS.forEach((v, k) => {
        msgLen += 2 + k.length + 2 + v.length;
    });
    const msg = Buffer.allocUnsafe(msgLen);
    const dw = new DataWriter(msg);
    writeRequestHeader(dw, Commands.Create, 1, 1);
    dw.writeString(TEST_STREAM);
    dw.writeInt32(TEST_ARGS.size);
    TEST_ARGS.forEach((v, k) => {
        dw.writeString(k);
        dw.writeString(v);
    });
    return msg;
}

describe('Create', () => {
    testClientRequest(new CreateRequest(TEST_STREAM, TEST_ARGS), request());
    // it('request', () => {
    //     expect(new CreateRequest(TEST_STREAM, TEST_ARGS).serialize(1)).deep.eq(request());
    // });
});
