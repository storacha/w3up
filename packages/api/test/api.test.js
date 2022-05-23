import { mf, test } from './helpers/setup.js'

test.before((t) => {
  t.context = { mf }
})

test('should work', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/version')
  const rsp = await res.json()
  t.truthy(rsp.branch)
})
