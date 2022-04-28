import { Miniflare } from 'miniflare'
import anyTest from 'ava'

/**
 * @typedef {import("ava").TestFn<{mf: Miniflare}} TestFn
 */

/** @type {TestFn} */
const test = anyTest

test.before((t) => {
  const mf = new Miniflare({
    packagePath: true,
    wranglerConfigPath: true,
  })
  t.context = { mf }
})

test('should work', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/version')
  const rsp = await res.json()
  t.truthy(rsp.branch)
})
