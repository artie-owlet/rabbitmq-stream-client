export function describeMethod(method: string, fn: (this: Mocha.Suite) => void): Mocha.Suite {
    return describe(`#${method}()`, fn);
}

export function describeStaticMethod(method: string, fn: (this: Mocha.Suite) => void): Mocha.Suite {
    return describe(`.${method}()`, fn);
}
