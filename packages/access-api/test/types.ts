/* eslint-disable import/export */
import * as API from '../src/api.js'

export * from '../src/api.js'

export interface ServerContext {
  id: API.Signer
  codec?: API.InboundCodec
}

export interface TestContext {
  service: API.Signer<API.ServiceDID>

  mail: { take: () => API.Await<{ to: string; url: string }> }
  connection: API.ConnectionView<API.Service>

  fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>

  webSocket: (input: RequestInfo, init?: RequestInit) => Promise<WebSocket>
}

export interface Assert {
  equal: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  deepEqual: <Actual, Expected extends Actual>(
    actual: Actual,
    expected: Expected,
    message?: string
  ) => unknown
  ok: <Actual>(actual: Actual, message?: string) => unknown
}

export type Test = (assert: Assert, context: TestContext) => unknown
export type Tests = Record<string, Test>
