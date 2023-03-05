import { expect } from 'chai';

import { DataWriter } from '../../src/messages/data-writer';
import { Commands } from '../../src/messages/constants';

import { writeHeader } from './common';

import { Credit, CreditResponse } from '../../src/messages/credit';

const TEST_SUB_ID = 2;
const TEST_CREDIT = 5;
const TEST_RESPONSE_CODE = 0x04;

function command(): Buffer {
    const msg = Buffer.allocUnsafe(8 + 1 + 2);
    const dw = new DataWriter(msg);
    writeHeader(dw, Commands.Credit, 1);
    dw.writeUInt8(TEST_SUB_ID);
    dw.writeUInt16(TEST_CREDIT);
    return msg;
}

function response(): Buffer {
    const msg = Buffer.allocUnsafe(8 + 2 + 1);
    const dw = new DataWriter(msg);
    writeHeader(dw, Commands.Credit, 1);
    dw.writeUInt16(TEST_RESPONSE_CODE);
    dw.writeUInt8(TEST_SUB_ID);
    return msg;
}

describe('Credit', () => {
    it('command', () => {
        expect(new Credit(TEST_SUB_ID, TEST_CREDIT).serialize()).deep.eq(command());
    });

    it('response error', () => {
        const res = new CreditResponse(response());
        expect(res.code).eq(TEST_RESPONSE_CODE);
        expect(res.subId).eq(TEST_SUB_ID);
    });
});
