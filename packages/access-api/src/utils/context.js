import { Logging } from '@web3-storage/worker-utils/logging'
import { Toucan, RequestData } from 'toucan-js'
import { Signer } from '@ucanto/principal/ed25519'
import { loadConfig } from '../config.js'
import { Accounts } from '../models/accounts.js'
import { Spaces } from '../models/spaces.js'
import { Validations } from '../models/validations.js'
import * as Email from './email.js'
import * as UCANLog from './ucan-log.js'
import { createUploadApiConnection } from '../service/upload-api-proxy.js'
import { DID } from '@ucanto/core'
import {
  DbDelegationsStorageWithR2,
  delegationsTableBytesToArrayBuffer,
} from '../models/delegations.js'
import { createD1Database } from './d1.js'
import { DbProvisions } from '../models/provisions.js'

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
  const email =
    config.ENV === 'test' ||
    (config.ENV === 'dev' && env.DEBUG_EMAIL === 'true')
      ? Email.debug()
      : Email.configure({
          token: config.POSTMARK_TOKEN,
          sender: config.POSTMARK_SENDER,
        })

  const ucanLog =
    config.UCAN_LOG_URL && config.UCAN_LOG_BASIC_AUTH
      ? UCANLog.connect({
          url: new URL(config.UCAN_LOG_URL),
          auth: config.UCAN_LOG_BASIC_AUTH,
        })
      : UCANLog.debug()

  // Sentry
  const sentry = new Toucan({
    context: ctx,
    integrations: [
      new RequestData({
        allowedHeaders: ['user-agent', 'x-client'],
        allowedSearchParams: /(.*)/,
      }),
    ],
    request,
    dsn: config.SENTRY_DSN,
    debug: false,
    environment: config.ENV,
    release: config.VERSION,
  })

  // Logging
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
  const signer = Signer.parse(config.PRIVATE_KEY).withDID(config.DID)
  return {
    log,
    signer,
    config,
    url,
    models: {
      delegations: new DbDelegationsStorageWithR2(
        createD1Database(config.DB, {
          bytes: (v) => {
            return delegationsTableBytesToArrayBuffer(v) ?? v
          },
        }),
        config.DELEGATIONS_BUCKET
      ),
      spaces: new Spaces(config.DB),
      validations: new Validations(config.VALIDATIONS),
      accounts: new Accounts(config.DB),
      provisions: new DbProvisions(
        config.PROVIDERS,
        createD1Database(config.DB)
      ),
    },
    email,
    ucanLog,
    uploadApi: createUploadApiConnection({
      audience: DID.parse(config.DID).did(),
      url: new URL(config.UPLOAD_API_URL),
      fetch: globalThis.fetch.bind(globalThis),
    }),
  }
}
