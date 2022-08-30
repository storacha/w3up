import { UCAN } from '@ucanto/core'
import * as Server from '@ucanto/server'
import { Accounts } from '../kvs/accounts.js'
import { sendEmail } from '../utils/email.js'
import {
  identityIdentify,
  identityRegister,
  identityValidate,
} from '@web3-storage/access/capabilities'
import { HTTPError } from '@web3-storage/worker-utils/error'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns {import('@web3-storage/access/types').Service}
 */
export function service(ctx) {
  return {
    identity: {
      validate: Server.provide(
        identityValidate,
        async ({ capability, context, invocation }) => {
          const accounts = new Accounts()

          const email = await accounts.get(capability.caveats.as)
          if (email) {
            throw new HTTPError('Email already registered.', { status: 400 })
          }

          const delegation = await identityRegister
            .invoke({
              audience: invocation.issuer,
              issuer: ctx.keypair,
              with: capability.caveats.as,
              caveats: {
                as: capability.with,
              },
              lifetimeInSeconds: 300,
            })
            .delegate()

          const url = `${ctx.url.protocol}//${
            ctx.url.host
          }/validate?ucan=${UCAN.format(delegation.data)}`

          // For testing
          if (ctx.config.ENV === 'test') {
            return {
              delegation: url,
            }
          }

          await sendEmail({
            to: capability.caveats.as.replace('mailto:', ''),
            url,
            token: ctx.config.POSTMARK_TOKEN,
          })
        }
      ),
      register: Server.provide(
        identityRegister,
        async ({ capability, context, invocation }) => {
          const accounts = new Accounts()
          await accounts.register(
            capability.caveats.as,
            capability.with,
            invocation.cid
          )

          W3ACCESS_METRICS.writeDataPoint({
            blobs: [ctx.config.ENV, 'new_account'],
            doubles: [1],
          })
        }
      ),
      identify: Server.provide(identityIdentify, async ({ capability }) => {
        const accounts = new Accounts()

        const result = await accounts.get(capability.with)
        return result?.account
      }),
    },
    // @ts-ignore
    testing: {
      pass() {
        return 'test pass'
      },
      fail() {
        throw new Error('test fail')
      },
    },
  }
}
