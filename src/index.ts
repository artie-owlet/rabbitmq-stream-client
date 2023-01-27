import { Client } from './client';

const cli = new Client({
    host: '127.0.0.1',
    port: 5552,
    username: 'guest',
    password: 'guest',
    vhost: '/',
    reconnectTimeoutMs: 2000,
});
cli.on('open', () => console.log('OPEN'));
cli.on('close', () => console.log('CLOSE'));
cli.on('error', (err: Error) => console.log('ERROR', err.message));
