// similar to mocha `it`
export type TestAdder = (
  name: string,
  runTest: () => Promise<unknown>
) => Promise<unknown>
