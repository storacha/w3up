import { context, test } from './helpers/context.js'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('should work', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/version')
  const rsp = await res.json()
  t.truthy(rsp.branch)
})
