/* eslint-disable no-console */
import { Signer } from '@ucanto/principal/ed25519'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/access'
import dotenv from 'dotenv'
import { createFetchMock } from '@miniflare/core'
import { Miniflare, Log, LogLevel } from 'miniflare'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrate } from '../../scripts/migrate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '..', '.env.tpl'),
})

/**
 * @typedef {Omit<import('../../src/bindings').Env, 'SPACES'|'VALIDATIONS'|'__D1_BETA__'|'DELEGATIONS_BUCKET'>} AccessApiBindings - bindings object expected by access-api workers
 */

/**
 * Given a map of environment vars, return a map of bindings that can be passed with access-api worker invocations.
 *
 * @param {any} env - environment variables
 * @returns {AccessApiBindings} - env bindings expected by access-api worker objects
 */
function createBindings(env) {
  return {
    ...env,
    ENV: 'test',
    DEBUG: 'false',
    DID: env.DID || 'did:web:test.web3.storage',
    PRIVATE_KEY: env.PRIVATE_KEY || '',
    POSTMARK_TOKEN: env.POSTMARK_TOKEN || '',
    SENTRY_DSN: env.SENTRY_DSN || '',
    LOGTAIL_TOKEN: env.LOGTAIL_TOKEN || '',
    W3ACCESS_METRICS: createAnalyticsEngine(),
    UPLOAD_API_URL: env.UPLOAD_API_URL || '',
    UCAN_LOG_URL: env.UCAN_LOG_URL || '',
  }
}

/**
 * @typedef {{testing: {
 * pass: Ucanto.ServiceMethod<*, string, Ucanto.Failure>
 * fail: Ucanto.ServiceMethod<*, never, Ucanto.Failure>
 * }}} TestService
 * @typedef {object} Options
 * @property {Partial<AccessApiBindings>} [env] - environment variables to use when configuring access-api. Defaults to process.env.
 * @property {Record<string, unknown>} [globals] - globals passed into miniflare
 *
 * @param {Options} options
 */
export async function context({ env = {}, globals } = {}) {
  const bindings = createBindings({
    ...process.env,
    ...env,
  })
  const servicePrincipal = Signer.parse(bindings.PRIVATE_KEY).withDID(
    bindings.DID
  )

  const fetchMock = createFetchMock()
  const mf = new Miniflare({
    packagePath: true,
    wranglerConfigPath: true,
    sourceMap: true,
    modules: true,
    bindings,
    d1Persist: undefined,
    buildCommand: undefined,
    log: new Log(LogLevel.ERROR),
    ...(globals ? { globals } : {}),
    fetchMock,
  })

  const binds = await mf.getBindings()
  const db = /** @type {D1Database} */ (binds.__D1_BETA__)
  await migrate(db)

  const conn =
    /** @type {Ucanto.ConnectionView<Access.Service & TestService>} */ (
      Access.connection({
        principal: servicePrincipal,
        // @ts-ignore
        fetch: mf.dispatchFetch.bind(mf),
        url: new URL('http://localhost:8787'),
      })
    )

  // Mock request to https://up.web3.storage/ucan
  // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
  const origin = fetchMock.get('https://up.web3.storage')
  origin
    .intercept({ method: 'POST', path: '/ucan' })
    .reply(200, 'Mocked response!')

  return {
    mf,
    conn,
    service: servicePrincipal,
    issuer: await Signer.generate(),
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
