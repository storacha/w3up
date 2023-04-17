// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as UCAN from '@ucanto/interface'
import { DID } from '@ucanto/core'

/**
 * Loads configuration variables from the global environment and returns a JS object
 * keyed by variable names.
 *
 * @param {import("./bindings").Env} env
 */
export function loadConfig(env) {
  /** @type Record<string, string> */
  const vars = {}

  /** @type {Array<keyof env>} */
  const required = [
    'DID',
    'ENV',
    'DEBUG',
    'PRIVATE_KEY',
    'SENTRY_DSN',
    'POSTMARK_TOKEN',
    'LOGTAIL_TOKEN',
  ]

  for (const name of required) {
    const val = env[name]
    if (typeof val === 'string' && val.length > 0) {
      vars[name] = val
    } else {
      throw new Error(
        `Missing required config variables: ${name}. Check your .env, testing globals or cloudflare vars.`
      )
    }
  }

  if (typeof env.DELEGATIONS_BUCKET !== 'object') {
    throw new TypeError(
      `expected env.DELEGATIONS_BUCKET to be an R2Bucket object, but got ${typeof env.DELEGATIONS_BUCKET}`
    )
  }

  return {
    DEBUG: boolValue(vars.DEBUG),
    ENV: parseRuntimeEnv(vars.ENV),

    POSTMARK_TOKEN: vars.POSTMARK_TOKEN,
    POSTMARK_SENDER: env.POSTMARK_SENDER,
    SENTRY_DSN: vars.SENTRY_DSN,
    LOGTAIL_TOKEN: vars.LOGTAIL_TOKEN,
    UCAN_LOG_BASIC_AUTH: env.UCAN_LOG_BASIC_AUTH,
    UCAN_LOG_URL: env.UCAN_LOG_URL,

    // These are injected in esbuild
    // @ts-ignore
    // eslint-disable-next-line no-undef
    BRANCH: ACCOUNT_BRANCH,
    // @ts-ignore
    // eslint-disable-next-line no-undef
    VERSION: ACCOUNT_VERSION,
    // @ts-ignore
    // eslint-disable-next-line no-undef
    COMMITHASH: ACCOUNT_COMMITHASH,

    PRIVATE_KEY: vars.PRIVATE_KEY,
    DID: /** @type {UCAN.DID<"web">} */ (DID.parse(vars.DID).did()),

    /** DIDs of services that can be used to provision spaces. */
    PROVIDERS: env.PROVIDERS
      ? env.PROVIDERS.split(',').map(
          (id) => /** @type {UCAN.DID<"web">} */ (DID.parse(id).did())
        )
      : [/** @type {UCAN.DID<"web">} */ (DID.parse(vars.DID).did())],

    UPLOAD_API_URL: env.UPLOAD_API_URL || 'https://up.web3.storage/',
    // bindings
    METRICS:
      /** @type {import("./bindings").AnalyticsEngine} */ (
        env.W3ACCESS_METRICS
      ) || createAnalyticsEngine(),
    SPACES: env.SPACES,
    VALIDATIONS: env.VALIDATIONS,
    DB: /** @type {D1Database} */ (env.__D1_BETA__),
    DELEGATIONS_BUCKET: env.DELEGATIONS_BUCKET,
  }
}

/**
 * Returns `true` if the string `s` is equal to `"true"` (case-insensitive) or `"1", and false for `"false"`, `"0"` or an empty value.
 *
 * @param {string} s
 * @returns {boolean}
 */
function boolValue(s) {
  return Boolean(s && JSON.parse(String(s).toLowerCase()))
}

/**
 * Validates that `s` is a defined runtime environment name and returns it.
 *
 * @param {unknown} s
 */
function parseRuntimeEnv(s) {
  switch (s) {
    case 'test':
    case 'dev':
    case 'staging':
    case 'production': {
      return s
    }
    default: {
      throw new Error('invalid runtime environment name: ' + s)
    }
  }
}

export function createAnalyticsEngine() {
  /** @type {Map<string,import("./bindings").AnalyticsEngineEvent>} */
  const store = new Map()

  return {
    writeDataPoint: (
      /** @type {import("./bindings").AnalyticsEngineEvent} */ event
    ) => {
      store.set(
        `${Date.now()}${(Math.random() + 1).toString(36).slice(7)}`,
        event
      )
    },
    _store: store,
  }
}
