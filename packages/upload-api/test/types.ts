import * as API from '../src/types.js'
import assert from 'node:assert'

export * from '../src/types.js'

export interface ServerContext {
  id: API.Signer
  codec?: API.InboundCodec
}

export type TestContext = API.UcantoServerTestContext
export interface ProviderTestContext extends TestContext {
  space: API.Signer<API.SpaceDID>
  agent: API.Signer<API.DIDKey>
  account: API.UCAN.Signer<API.AccountDID>
}

export interface Assert {
  equal: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => void
  deepEqual: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => void
  ok: <Actual>(actual: Actual, message?: string) => void
  rejects: typeof assert.rejects
}

export type Test = (assert: Assert, context: TestContext) => unknown
export type Tests = Record<string, Test>
