import { setImmediate as pause, setTimeout as sleep } from 'timers/promises';
import { expect } from 'chai';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const net = require('net') as typeof import('net');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tls = require('tls') as typeof import('tls');

import { promisifyEvent } from './promisify-event';
import { SocketMock, netConnect, tlsConnect } from './mock/socket';

import { Connection } from '../src/connection';
import { Commands } from '../src/messages/constants';

function createMessage(data: Buffer): Buffer {
    const msg = Buffer.allocUnsafe(data.length + 4);
    msg.writeUInt32BE(data.length, 0);
    data.copy(msg, 4);
    return msg;
}

describe('Connection', () => {
    let netConnectOrig: typeof net.connect;
    let tlsConnectOrig: typeof tls.connect;

    before(() => {
        netConnectOrig = net.connect;
        net.connect = netConnect as unknown as typeof net.connect;
        tlsConnectOrig = tls.connect;
        tls.connect = tlsConnect as unknown as typeof tls.connect;
    });

    after(() => {
        net.connect = netConnectOrig;
        tls.connect = tlsConnectOrig;
    });

    afterEach(() => {
        SocketMock.clear();
    });

    describe('constructor', () => {
        it('should create net socket', () => {
            new Connection('localhost', 5552, {});
            expect(SocketMock.sock.host).eq('localhost');
            expect(SocketMock.sock.port).eq(5552);
            expect(SocketMock.sock.tls).undefined;
        });

        it('should create tls socket', () => {
            const tlsParams = {};
            new Connection('localhost', 5552, {
                tls: tlsParams,
            });
            expect(SocketMock.sock.host).eq('localhost');
            expect(SocketMock.sock.port).eq(5552);
            expect(SocketMock.sock.tls).eq(tlsParams);
        });

        it('should set keepAlive on', () => {
            new Connection('localhost', 5552, {
                keepAlive: 30,
            });
            expect(SocketMock.sock.calls).deep.eq([
                ['setKeepAlive', true, 30],
            ]);
        });

        it('should set keepAlive off', () => {
            new Connection('localhost', 5552, {
                keepAlive: false,
            });
            expect(SocketMock.sock.calls).deep.eq([
                ['setKeepAlive', false],
            ]);
        });

        it('should set noDelay', () => {
            new Connection('localhost', 5552, {
                noDelay: true,
            });
            expect(SocketMock.sock.calls).deep.eq([
                ['setNoDelay', true],
            ]);
        });

        it('should set connect timeout', async () => {
            let connErr: Error | undefined;
            const conn = new Connection('localhost', 5552, {
                connectTimeoutMs: 100,
            });
            conn.on('error', (err) => connErr = err);
            await promisifyEvent(conn, 'close');
            expect(connErr).instanceOf(Error)
                .property('message', 'Connect timeout');
            expect(SocketMock.sock.calls).deep.eq([
                ['destroy', connErr],
            ]);
        }).slow(300);
    });

    describe('#setFrameMax()', () => {
        it('should set frameMax', () => {
            const conn = new Connection('localhost', 5552, {});
            conn.setFrameMax(2);
            expect(conn.sendMessage.bind(conn, Buffer.from('test'))).throw('Frame too large');
        });
    });

    describe('#setHeartbeat()', () => {
        let conn: Connection;
        let calls: [string, ...unknown[]][];
        const hbMsg = createMessage(Buffer.from([0,Commands.Heartbeat,0,1]));

        beforeEach(async () => {
            conn = new Connection('localhost', 5552, {});
            calls = SocketMock.sock.calls;
            const p = promisifyEvent(conn, 'connect');
            SocketMock.sock.onconnect();
            await p;
        });

        afterEach(() => {
            conn.close();
        });

        it('should start heartbeat', async () => {
            conn.setHeartbeat(0.1);
            await sleep(150);
            expect(calls.length).eq(1);
            expect(calls[0][0]).eq('write');
            expect((calls[0][1] as Buffer).toString('hex')).eq(hbMsg.toString('hex'));
            conn.close();
        }).slow(400);

        it('should reset heartbeat', async () => {
            conn.setHeartbeat(0.1);
            conn.setHeartbeat(0.2);
            await sleep(150);
            expect(calls.length).eq(0);
            await sleep(100);
            expect(calls.length).eq(1);
            expect(calls[0][0]).eq('write');
            expect((calls[0][1] as Buffer).toString('hex')).eq(hbMsg.toString('hex'));
            conn.close();
        }).slow(600);

        it('should stop heartbeat', async () => {
            conn.setHeartbeat(0.1);
            conn.setHeartbeat(0);
            await sleep(150);
            expect(calls.length).eq(0);
        }).slow(400);
    });

    describe('#sendMessage()', () => {
        it('should write message to socket', () => {
            const conn = new Connection('localhost', 5552, {});
            const msg = Buffer.from('test');
            conn.sendMessage(msg);
            expect(SocketMock.sock.calls).deep.eq([
                ['write', msg],
            ]);
        });
    });

    describe('#close()', () => {
        it('should close connection', () => {
            const conn = new Connection('localhost', 5552, {});
            conn.close();
            expect(SocketMock.sock.calls).deep.eq([
                ['end'],
            ]);
        });
    });

    describe('#onConnect()', () => {
        it('should stop connect timer', async () => {
            let connErr: Error | undefined;
            const conn = new Connection('localhost', 5552, {
                connectTimeoutMs: 100,
            });
            conn.on('error', (err) => connErr = err);
            SocketMock.sock.onconnect();
            await sleep(150);
            expect(connErr).undefined;
        }).slow(400);
    });

    describe('#onData()', () => {
        let conn: Connection;

        beforeEach(() => {
            conn = new Connection('localhost', 5552, {});
            SocketMock.sock.onconnect();
        });

        it('should parse messages', async () => {
            const send = [
                createMessage(Buffer.from('first')),
                createMessage(Buffer.from('second')),
            ];
            const recv = [] as Buffer[];
            conn.on('message', (msg) => recv.push(msg));
            send.forEach((msg) => SocketMock.sock.emit('data', msg));
            await pause();
            expect(recv.length).eq(2);
            recv.forEach((msg, id) => expect(msg.toString('hex')).eq(send[id].toString('hex')));
        });

        it('should parse merged and split messages', async () => {
            const send = [
                createMessage(Buffer.from('first')),
                createMessage(Buffer.from('second')),
                createMessage(Buffer.from('third')),
            ];
            const data = Buffer.concat(send);
            const recv = [] as Buffer[];
            conn.on('message', (msg) => recv.push(msg));
            SocketMock.sock.emit('data', data.subarray(0, 10));
            SocketMock.sock.emit('data', data.subarray(10, 24));
            SocketMock.sock.emit('data', data.subarray(24));
            await pause();
            expect(recv.length).eq(3);
            recv.forEach((msg, id) => expect(msg.toString('hex')).eq(send[id].toString('hex')));
        });
    });

    describe('#onHeartbeatTimeout()', () => {
        it('should emit error and close socket after 2 timeouts', async () => {
            let hbErr: Error | undefined;
            const conn = new Connection('localhost', 5552, {});
            conn.on('error', (err) => hbErr = err);
            SocketMock.sock.onconnect();
            conn.setHeartbeat(0.1);
            await sleep(250);
            expect(hbErr).instanceOf(Error)
                .property('message', 'Heartbeat timeout');
            expect(SocketMock.sock.closed).eq(true);
        }).slow(600);
    });
});
