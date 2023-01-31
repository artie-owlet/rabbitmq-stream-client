import { Client } from './client';
import { OffsetTypes } from './messages/offset';

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
        await cli.subscribe(1, 'test-stream', {type: OffsetTypes.Next}, 2, new Map());
        console.log('OK');
    } catch (err) {
        console.log(err);
    }
});
cli.on('deliver', (msgs) => msgs.forEach((msg) => console.log('DELIVER', msg.toString())));
cli.on('close', () => console.log('CLOSE'));
cli.on('error', (err: Error) => console.log('ERROR', err));
// setTimeout(() => cli.close(), 3000);
