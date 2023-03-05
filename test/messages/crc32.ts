import { expect } from 'chai';

import { crc32 } from '../../src/messages/crc32';

describe('crc32', () => {
    it('should calculate CRC32', () => {
        expect(crc32(Buffer.from('test message'))).eq(0x1f8c678b);
    });
});
