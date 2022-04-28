import path from 'path'
import { fileURLToPath } from 'url'
import { Miniflare } from 'miniflare'
import dotenv from 'dotenv'
import anyTest from 'ava'

/**
 * @typedef {import("ava").TestFn<{mf: Miniflare}} TestFn
 */

/** @type {TestFn} */
const test = anyTest
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '..', '..', '.env')
dotenv.config({
  path: envPath,
})

test.before((t) => {
  const mf = new Miniflare({
    envPath,
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
