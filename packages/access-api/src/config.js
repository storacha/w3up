import { Signer } from '@ucanto/principal/ed25519'
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

  const DID = env.DID
  const PRIVATE_KEY = vars.PRIVATE_KEY
  const signer = configureSigner({ DID, PRIVATE_KEY })
  return {
    DEBUG: boolValue(vars.DEBUG),
    ENV: parseRuntimeEnv(vars.ENV),

    POSTMARK_TOKEN: vars.POSTMARK_TOKEN,
    POSTMARK_SENDER: env.POSTMARK_SENDER || undefined,
    SENTRY_DSN: vars.SENTRY_DSN,
    LOGTAIL_TOKEN: vars.LOGTAIL_TOKEN,

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

    signer,

    // bindings
    METRICS:
      /** @type {import("./bindings").AnalyticsEngine} */ (
        env.W3ACCESS_METRICS
      ) || createAnalyticsEngine(),
    SPACES: env.SPACES,
    VALIDATIONS: env.VALIDATIONS,
    DB: /** @type {D1Database} */ (env.__D1_BETA__),

    UPLOAD_API_URL: env.UPLOAD_API_URL,
    UPLOAD_API_URL_STAGING: env.UPLOAD_API_URL_STAGING,
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

/**
 * Given a config, return a ucanto Signer object representing the service
 *
 * @param {object} config
 * @param {string} config.PRIVATE_KEY - multiformats private key of primary signing key
 * @param {string} [config.DID] - public DID for the service (did:key:... derived from PRIVATE_KEY if not set)
 * @returns {Signer.Signer}
 */
export function configureSigner(config) {
  const signer = Signer.parse(config.PRIVATE_KEY)
  if (config.DID) {
    return signer.withDID(DID.parse(config.DID).did())
  }
  return signer
}

/**
 * @template {UCAN.DID} ConfigDID
 * @template {UCAN.SigAlg} [Alg=UCAN.SigAlg]
 * @param {object} config
 * @param {ConfigDID} [config.DID] - public DID for the service
 * @param {import('@ucanto/interface').Verifier<ConfigDID,Alg>} verifier
 * @returns {import('@ucanto/interface').Verifier<ConfigDID,Alg>}
 */
export function configureVerifier(config, verifier) {
  if (config.DID) {
    return verifier.withDID(DID.parse(config.DID).did())
  }
  return verifier
}
