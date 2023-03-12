import { createServer } from 'net';
import path from 'path';
import { expect, use as chaiUse } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Client, IClientOptions } from '../src/client';

const TEST_HOST = 'localhost';
const TEST_PORT = 4001;
const TEST_TLS_PORT = 4011;
const TEST_FAKE_PORT = 4000;
const TEST_BASE_OPTS: IClientOptions = {
    username: 'guest',
    password: 'guest',
    vhost:'/',
};

chaiUse(chaiAsPromised);

describe('Client', () => {
    describe('.createClient()', () => {
        let cli: Client | undefined;

        afterEach(() => {
            if (cli !== undefined) {
                cli.close();
            }
            cli = undefined;
        });
    
        it('should setup client', async () => {
            cli = await Client.createClient(TEST_HOST, TEST_PORT, {
                ...TEST_BASE_OPTS,
                noDelay: true,
                connectTimeoutMs: 1000,
            });
        }).slow(1000);

        it('should setup tls client', async () => {
            cli = await Client.createClient(TEST_HOST, TEST_TLS_PORT, {
                ...TEST_BASE_OPTS,
                tls: {
                    pfx: path.resolve(__dirname, '../.ci/rabbimq-ssl/client.pfx'),
                },
            });
        }).slow(1000);

        it('should throw on connect timeout', async () => {
            const fakeSrv = createServer((sock) => {
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                sock.on('error', () => {});
            }).listen(TEST_FAKE_PORT, '0.0.0.0');
            await expect(await Client.createClient(TEST_HOST, TEST_FAKE_PORT, {
                ...TEST_BASE_OPTS,
                connectTimeoutMs: 50,
            })).eventually.throw('Connect timeout');
            fakeSrv.close();
        }).slow(200);
    });
});

describe('Client', () => {
    // it('should publish and consume messages', async () => {
    //     const sub = await Client.createClient(TEST_HOST, TEST_PORT, TEST_BASE_OPTS);
    //     await 
    // });
});
