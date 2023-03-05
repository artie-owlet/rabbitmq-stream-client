import { expect, use as chaiUse } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chaiUse(chaiAsPromised);

import { Client } from '../src/client';

describe('Real test', () => {
    it('should connect', async () => {
        const p = Client.createClient('127.0.0.1', 5552, {
            username: 'guest',
            password: 'guest',
            vhost: '/',
            connectTimeoutMs: 1000,
            noDelay: false,
        });
        await expect(p).eventually.instanceOf(Client);
        (await p).close();
    });

    it('should throw', async () => {
        const p = Client.createClient('127.0.0.1', 5552, {
            username: 'guest',
            password: 'guest2',
            vhost: '/',
            connectTimeoutMs: 1000,
            noDelay: false,
        });
        await expect(p).eventually.throw();
    });
});
