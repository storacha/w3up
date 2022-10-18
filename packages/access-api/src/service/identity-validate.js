import { UCAN } from '@ucanto/core'
import * as Server from '@ucanto/server'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Identity from '@web3-storage/access/capabilities/identity'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function identityValidateProvider(ctx) {
  return Server.provide(
    Identity.validate,
    async ({ capability, context, invocation }) => {
      const delegation = await Identity.register
        .invoke({
          audience: Verifier.parse(invocation.issuer.did()),
          issuer: ctx.keypair,
          with: capability.nb.as,
          nb: {
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
        to: capability.nb.as.replace('mailto:', ''),
        url,
      })
    }
  )
}
