import EventEmitter from 'events';

interface IArguments {
    [index: number]: unknown;
}

export class BaseMock  extends EventEmitter {
    public calls = [] as [string, ...unknown[]][];

    protected recordCall(args: IArguments, exclude = [] as number[]): void {
        const err = {} as Error;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        Error.captureStackTrace(err, BaseMock.prototype.recordCall);
        const pst = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, sst) => {
            return sst;
        };
        const stack = ((err.stack as unknown) as NodeJS.CallSite[]);
        Error.prepareStackTrace = pst;

        const rec = [stack[0].getFunctionName() || ''] as [string, ...unknown[]];
        for (const key in args) {
            const id = Number(key);
            if (!exclude.includes(id)) {
                rec.push(args[id]);
            }
        }
        this.calls.push(rec);
    }
}
