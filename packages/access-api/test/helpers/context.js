import { Signer } from '@ucanto/principal/ed25519'
import { connection as w3connection } from '@web3-storage/access/connection'
import anyTest from 'ava'
import dotenv from 'dotenv'
import { Miniflare } from 'miniflare'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '..', '.env.tpl'),
})
/**
 * @typedef {import("ava").TestFn<Awaited<ReturnType<typeof context>>>} TestFn
 */

// eslint-disable-next-line unicorn/prefer-export-from
export const test = /** @type {TestFn} */ (anyTest)

export const bindings = {
  ENV: 'test',
  DEBUG: 'false',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN || '',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOGTAIL_TOKEN: process.env.LOGTAIL_TOKEN || '',
  W3ACCESS_METRICS: createAnalyticsEngine(),
}

export const serviceAuthority = Signer.parse(bindings.PRIVATE_KEY)

export async function context() {
  const principal = await Signer.generate()
  const mf = new Miniflare({
    packagePath: true,
    wranglerConfigPath: true,
    sourceMap: true,
    modules: true,
    bindings,
  })

  return {
    mf,
    conn: w3connection({
      id: principal,
      url: new URL('http://localhost:8787'),
      fetch: mf.dispatchFetch.bind(mf),
    }),
    service: Signer.parse(bindings.PRIVATE_KEY),
    issuer: principal,
  }
}

export function createAnalyticsEngine() {
  /** @type {Map<string,import('../../src/bindings').AnalyticsEngineEvent>} */
  const store = new Map()

  return {
    writeDataPoint: (
      /** @type {import('../../src/bindings').AnalyticsEngineEvent} */ event
    ) => {
      store.set(
        `${Date.now()}${(Math.random() + 1).toString(36).slice(7)}`,
        event
      )
    },
    _store: store,
  }
}
