/* eslint-disable no-console */
import { Signer } from '@ucanto/principal/ed25519'
import { connection } from '@web3-storage/access'
import dotenv from 'dotenv'
import { Miniflare } from 'miniflare'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrate } from '../../scripts/migrate.js'
import { D1QB } from 'workers-qb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '..', '.env.tpl'),
})

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
    d1Persist: undefined,
    buildCommand: undefined,
  })

  const binds = await mf.getBindings()
  const db = /** @type {D1Database} */ (binds.__D1_BETA__)
  await migrate(db)

  return {
    mf,
    conn: await connection({
      principal,
      // @ts-ignore
      fetch: mf.dispatchFetch.bind(mf),
      url: new URL('http://localhost:8787'),
    }),
    service: Signer.parse(bindings.PRIVATE_KEY),
    issuer: principal,
    db: new D1QB(db),
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
