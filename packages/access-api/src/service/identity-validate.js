import { UCAN } from '@ucanto/core'
import * as Server from '@ucanto/server'
import {
  identityRegister,
  identityValidate,
} from '@web3-storage/access/capabilities'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function identityValidateProvider(ctx) {
  return Server.provide(
    identityValidate,
    async ({ capability, context, invocation }) => {
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

      await ctx.email.sendValidation({
        to: capability.caveats.as.replace('mailto:', ''),
        url,
      })
    }
  )
}
