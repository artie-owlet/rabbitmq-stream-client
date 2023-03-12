// import fs from 'fs';
// import path from 'path';
import { Client } from '.';
import { OffsetTypes } from './messages/offset';

async function test(): Promise<void> {
    try {
        const cli1 = await Client.createClient('localhost', 4001, {
            username: 'guest',
            password: 'guest',
            vhost: '/',
            // connectionName: 'test123',
            // tls: {
            //     pfx: fs.readFileSync(path.resolve(__dirname, '../.ci/client.pfx')),
            // },
        });
        cli1.on('error', (err) => console.log('ERROR1', err));
        cli1.on('close', (reason) => console.log('CLOSE', reason));
        console.log(cli1.serverProperties);

        await cli1.subscribe(1, 'test-stream', {type: OffsetTypes.Last}, 5, new Map());
        cli1.on('deliver', (info, messages) => {
            console.log('DELIVER1', info);
            messages.forEach((msg) => console.log('MESSAGE', msg.toString('hex')));
            cli1.credit(1, messages.length);
        });

        // await cli1.create('test-stream', new Map());
        // console.log(await cli1.metadata(['test-stream']));

        // const cli2 = await Client.createClient('localhost', 4003, {
        //     username: 'guest',
        //     password: 'guest',
        //     vhost: '/',
        // });
        // cli2.on('error', (err) => console.log('ERROR2', err));
        // console.log('OK', cli2.serverProperties);
        // await cli2.subscribe(1, 'test-stream', {type: OffsetTypes.Last}, 5, new Map());
        // cli2.on('deliver', (info, msg) => console.log('DELIVER2', info, msg.toString()));

        // await cli1.declarePublisher(1, 'pub1', 'test-stream');
        // cli1.publish(1, 1n, Buffer.from('hello'));
        // console.log('PUB1 OK');
    } catch (err) {
        console.log('CATCH', err);
    }
}

void test();
