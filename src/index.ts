import { Client } from './client';
// import { OffsetTypes } from './messages/offset';

const cli = new Client({
    host: '127.0.0.1',
    port: 5552,
    username: 'guest',
    password: 'guest',
    vhost: '/',
    reconnectTimeoutMs: 2000,
});
cli.on('open', async (props) => {
    console.log('OPEN', props);
    try {
        // await cli.subscribe(1, 'test-stream', {type: OffsetTypes.Next}, 2, new Map());
        const stats = await cli.streamStats('test-stream');
        console.log(stats);
        console.log('OK');
    } catch (err) {
        console.log(err);
    }
});

let n = 0;
cli.on('deliver', (info) => {
    console.log('DELIVER', ++n, info.offsetValue);
});
cli.on('close', () => console.log('CLOSE'));
cli.on('error', (err: Error) => console.log('ERROR', err));
// setTimeout(() => cli.close(), 3000);
