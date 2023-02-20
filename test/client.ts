import { setImmediate as pause, /*setTimeout as sleep*/ } from 'timers/promises';
import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const connection = require('../src/connection') as typeof import('../src/connection');

import { /*describeMethod,*/ describeStaticMethod } from './mocha-format';
// import { promisifyEvent } from './promisify-event';
import { ConnectionMock } from './mock/connection';
import { messages } from './mock/messages';

import { Client } from '../src/client';

describe('Client', () => {
    let connectionOrig: typeof connection.Connection;

    before(() => {
        connectionOrig = connection.Connection;
        connection.Connection = ConnectionMock as unknown as typeof connection.Connection;
    });

    after(() => {
        connection.Connection = connectionOrig;
    });

    afterEach(() => {
        ConnectionMock.clear();
    });

    describeStaticMethod('createClient', () => {
        it('should create client', async () => {
            const p = Client.createClient('localhost', 5552, {
                username: 'guest',
                password: 'guest',
                vhost: '/',
                // requestTimeout: 1,
            });
            ConnectionMock.conn.emit('connect');
            await pause();
            ConnectionMock.conn.emit('message', messages.peerProperties);
            await pause();
            ConnectionMock.conn.emit('message', messages.saslHandshakePlain);
            await pause();
            ConnectionMock.conn.emit('message', messages.saslAuthPlain);
            await pause();
            ConnectionMock.conn.emit('message', messages.tune);
            await pause();
            ConnectionMock.conn.emit('message', messages.open);
            const cli = await p;
            expect(cli).instanceOf(Client);
            cli.close();
        });
    });
});
