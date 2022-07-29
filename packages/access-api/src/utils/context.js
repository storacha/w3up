import { SigningAuthority } from '@ucanto/authority'
import { config } from '../config.js'
import { Logging } from '@web3-storage/worker-utils/logging'
import Toucan from 'toucan-js'
import pkg from '../../package.json'

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
      debug: config.DEBUG,
      sentry: ['test', 'dev'].includes(config.ENV) ? undefined : sentry,
      branch: config.BRANCH,
      version: config.VERSION,
      commit: config.COMMITHASH,
    }
  )

  const keypair = SigningAuthority.parse(config.PRIVATE_KEY)
  return { params, log, keypair, config }
}
