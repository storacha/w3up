import { Logging } from '@web3-storage/worker-utils/logging'
import Toucan from 'toucan-js'
import pkg from '../../package.json'
import { loadConfig } from '../config.js'
import { Spaces } from '../models/spaces.js'
import { Validations } from '../models/validations.js'
import { Email } from './email.js'

/**
 * Obtains a route context object.
 *
 * @param {Request} request
 * @param {import('../bindings').Env} env
 * @param {Pick<FetchEvent, 'waitUntil' | 'passThroughOnException'>} ctx
 * @returns {import('../bindings').RouteContext}
 */
export function getContext(request, env, ctx) {
  const config = loadConfig(env)
  const sentry = new Toucan({
    context: ctx,
    request,
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
  })
  const log = new Logging(request, ctx, {
    token: config.LOGTAIL_TOKEN,
    debug: config.DEBUG,
    sentry: ['test', 'dev'].includes(config.ENV) ? undefined : sentry,
    branch: config.BRANCH,
    version: config.VERSION,
    commit: config.COMMITHASH,
    env: config.ENV,
  })
  const url = new URL(request.url)
  return {
    log,
    signer: config.signer,
    config,
    url,
    models: {
      spaces: new Spaces(config.DB),
      validations: new Validations(config.VALIDATIONS),
    },
    email: new Email({ token: config.POSTMARK_TOKEN }),
  }
}
