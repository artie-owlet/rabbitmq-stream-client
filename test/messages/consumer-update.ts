import { expect } from 'chai';

import { DataWriter } from '../../src/messages/data-writer';
import { Commands, RESPONSE_CODE_OK } from '../../src/messages/constants';

import { writeRequestHeader, writeResponseHeader } from './common';

import {
    ConsumerUpdateRequest,
    ConsumerUpdateResponseOk,
    ConsumerUpdateResponseNoStream,
} from '../../src/messages/consumer-update';
import { OffsetTypes } from '../../src/messages/offset';

const TEST_SUB_ID = 10;
const TEST_ABS_OFFSET = 1000n;
const TEST_TS_OFFSET = BigInt(Date.now());

function request(): Buffer {
    const msg = Buffer.allocUnsafe(12 + 4);
    const dw = new DataWriter(msg);
    writeRequestHeader(dw, Commands.ConsumerUpdate, 1, 1);
    dw.writeUInt8(TEST_SUB_ID);
    dw.writeUInt8(1);
    return msg;
}

function responseOkRel(): Buffer {
    const msg = Buffer.allocUnsafe(14 + 2);
    const dw = new DataWriter(msg);
    writeResponseHeader(dw, Commands.ConsumerUpdate, 1, 1, RESPONSE_CODE_OK);
    dw.writeUInt16(OffsetTypes.Last);
    return msg;
}

function responseOkAbs(): Buffer {
    const msg = Buffer.allocUnsafe(14 + 2 + 8);
    const dw = new DataWriter(msg);
    writeResponseHeader(dw, Commands.ConsumerUpdate, 1, 1, RESPONSE_CODE_OK);
    dw.writeUInt16(OffsetTypes.Offset);
    dw.writeUInt64(TEST_ABS_OFFSET);
    return msg;
}

function responseOkTs(): Buffer {
    const msg = Buffer.allocUnsafe(14 + 2 + 8);
    const dw = new DataWriter(msg);
    writeResponseHeader(dw, Commands.ConsumerUpdate, 1, 1, RESPONSE_CODE_OK);
    dw.writeUInt16(OffsetTypes.Timestamp);
    dw.writeUInt64(TEST_TS_OFFSET);
    return msg;
}

function responseNoStream(): Buffer {
    const msg = Buffer.allocUnsafe(14);
    const dw = new DataWriter(msg);
    writeResponseHeader(dw, Commands.ConsumerUpdate, 1, 1, 0x02);
    return msg;
}

describe('ConsumerUpdate', () => {
    it('request', () => {
        const req = new ConsumerUpdateRequest(request());
        expect(req.subId).eq(TEST_SUB_ID);
        expect(req.active).eq(true);
    });

    it('response relative offset', () => {
        expect(new ConsumerUpdateResponseOk(1, {
            type: OffsetTypes.Last,
        }).serialize()).deep.eq(responseOkRel());
    });

    it('response absolute offset', () => {
        expect(new ConsumerUpdateResponseOk(1, {
            type: OffsetTypes.Offset,
            value: TEST_ABS_OFFSET,
        }).serialize()).deep.eq(responseOkAbs());
    });

    it('response timestamp offset', () => {
        expect(new ConsumerUpdateResponseOk(1, {
            type: OffsetTypes.Timestamp,
            value: TEST_TS_OFFSET,
        }).serialize()).deep.eq(responseOkTs());
    });

    it('response no stream', () => {
        expect(new ConsumerUpdateResponseNoStream(1).serialize()).deep.eq(responseNoStream());
    });
});
