import { expect } from 'chai';

import { DataWriter } from '../../src/messages/data-writer';
import { Commands, RESPONSE_CODE_OK } from '../../src/messages/constants';

import { writeRequestHeader, writeResponseHeader } from './common';
import { CloseRequest, CloseResponse } from '../../src/messages/close';

function request(): Buffer {
    const reason = 'test reason';
    const msg = Buffer.allocUnsafe(12 + 2 + reason.length);
    const dw = new DataWriter(msg);
    writeRequestHeader(dw, Commands.Close, 1, 1);
    dw.writeString(reason);
    return msg;
}

function response(): Buffer {
    const msg = Buffer.allocUnsafe(14);
    const dw = new DataWriter(msg);
    writeResponseHeader(dw, Commands.Close, 1, 1, RESPONSE_CODE_OK);
    return msg;
}

describe('Close', () => {
    it('request', () => {
        const req = new CloseRequest(request());
        expect(req.reason).eq('test reason');
    });

    it('response', () => {
        expect(new CloseResponse(1).serialize()).deep.eq(response());
    });
});
