import { SigningAuthority } from '@ucanto/authority'
import { Logging } from '@web3-storage/worker-utils/logging'
import Toucan from 'toucan-js'
import pkg from '../../package.json'
import { config } from '../config.js'
import { Accounts } from '../kvs/accounts.js'
import { Validations } from '../kvs/validations.js'
import { Email } from './email.js'

const sentryOptions = {
  dsn: config.SENTRY_DSN,
  allowedHeaders: ['user-agent', 'x-client'],
  allowedSearchParams: /(.*)/,
  debug: false,
  environment: config.ENV,
  rewriteFrames: {
    root: '/',
  },
  release: config.VERSION,
  pkg,
}

/**
 * Obtains a route context object.
 *
 * @param {FetchEvent} event
 * @param {Record<string, string>} params - Parameters from the URL
 * @returns {import('../bindings').RouteContext}
 */
export function getContext(event, params) {
  const sentry = new Toucan({
    event,
    ...sentryOptions,
  })
  const log = new Logging(
    event.request,
    {
      passThroughOnException: event.passThroughOnException.bind(event),
      waitUntil: event.waitUntil.bind(event),
    },
    {
      token: config.LOGTAIL_TOKEN,
      debug: config.DEBUG,
      sentry: ['test', 'dev'].includes(config.ENV) ? undefined : sentry,
      branch: config.BRANCH,
      version: config.VERSION,
      commit: config.COMMITHASH,
      env: config.ENV,
    }
  )

  const keypair = SigningAuthority.parse(config.PRIVATE_KEY)
  const url = new URL(event.request.url)
  return {
    params,
    log,
    keypair,
    config,
    url,
    event,
    kvs: {
      accounts: new Accounts(config.ACCOUNTS),
      validations: new Validations(config.VALIDATIONS),
    },
    email: new Email({ token: config.POSTMARK_TOKEN }),
  }
}
