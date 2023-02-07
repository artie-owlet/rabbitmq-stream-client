import { Client } from './client';

const cliOpts = {
    username: 'guest',
    password: 'guest',
    vhost: '/',
};

async function test2(): Promise<void> {
    try {
        const cli = await Client.createClient('127.0.0.1', 5552, cliOpts);
        cli.on('close', (reason) => console.log('CLOSE', reason));
        cli.on('error', (err) => console.log('ERROR', err.message));
        console.log(cli.serverProperties);
    } catch (err) {
        console.log('CATCH', err);
    }
}

void test2();
