// export { Client, IClientOptions, IConsumerUpdateResolver, IDeliverInfo } from './client';
// export { installDecoder } from './messages/deliver';
// export { Offset, OffsetTypes } from './messages/offset';

import fs from 'fs';
import { Client } from './client';

async function test(): Promise<void> {
    try {
        const cli = await Client.createClient('localhost', 5551, {
            username: 'guest',
            password: 'guest',
            vhost: '/',
            tls: {
                pfx: fs.readFileSync(__dirname + '/../.ci/client.pfx'),
                // rejectUnauthorized: false,
            }
        });
        console.log('OK', cli.serverProperties);
        await cli.create('test-stream', new Map());
        console.log(await cli.metadata(['test-stream']));
    } catch (err) {
        console.log('CATCH', err);
    }
}

void test();
