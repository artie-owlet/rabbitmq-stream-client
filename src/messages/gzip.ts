import { gunzip } from 'zlib';

export function decodeGzip(input: Buffer): Promise<Buffer> {
    return new Promise((res, rej) => {
        gunzip(input, (err, output) => {
            if (err) {
                rej(err);
            } else {
                res(output);
            }
        });
    });
}
