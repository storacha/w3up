/* eslint-disable no-console */
import { Signer } from '@ucanto/principal/ed25519'
import { connection } from '@web3-storage/access'
import dotenv from 'dotenv'
import { Miniflare } from 'miniflare'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrate } from '../../scripts/migrate.js'
import { configureVerifier } from '../../src/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '..', '.env.tpl'),
})

/**
 * @typedef {Omit<import('../../src/bindings').Env, 'SPACES'|'VALIDATIONS'|'__D1_BETA__'>} AccessApiBindings - bindings object expected by access-api workers
 */

/**
 * Given a map of environment vars, return a map of bindings that can be passed with access-api worker invocations.
 *
 * @param {{ [key: string]: string | undefined }} env - environment variables
 * @returns {AccessApiBindings} - env bindings expected by access-api worker objects
 */
function createBindings(env) {
  return {
    ENV: 'test',
    DEBUG: 'false',
    DID: env.DID || '',
    PRIVATE_KEY: env.PRIVATE_KEY || '',
    POSTMARK_TOKEN: env.POSTMARK_TOKEN || '',
    SENTRY_DSN: env.SENTRY_DSN || '',
    LOGTAIL_TOKEN: env.LOGTAIL_TOKEN || '',
    W3ACCESS_METRICS: createAnalyticsEngine(),
  }
}

/**
 * Good default bindings useful for tests - configured via process.env
 */
export const bindings = createBindings(process.env)

export const serviceAuthority = Signer.parse(bindings.PRIVATE_KEY)

/**
 * @param {object} [options]
 * @param {Record<string,string|undefined>} options.environment - environment variables to use when configuring access-api. Defaults to process.env.
 */
export async function context(options) {
  const environment = options?.environment || process.env
  const principal = await Signer.generate()
  const bindings = createBindings({
    ...environment,
  })
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
    conn: connection({
      principal: configureVerifier(environment, principal),
      // @ts-ignore
      fetch: mf.dispatchFetch.bind(mf),
      url: new URL('http://localhost:8787'),
    }),
    service: Signer.parse(bindings.PRIVATE_KEY),
    issuer: principal,
    d1: db,
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
