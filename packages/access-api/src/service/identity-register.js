import * as Server from '@ucanto/server'
import { identityRegister } from '@web3-storage/access/capabilities'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function identityRegisterProvider(ctx) {
  return Server.provide(
    identityRegister,
    async ({ capability, context, invocation }) => {
      await ctx.kvs.accounts.register(
        capability.caveats.as,
        capability.with,
        invocation.cid
      )

      ctx.config.METRICS.writeDataPoint({
        blobs: [ctx.config.ENV, 'new_account'],
        doubles: [1],
      })

      ctx.email.send({
        to: 'david@dag.house,jchris@dag.house,it@dag.house',
        subject: 'New w3account Created',
        textBody: `New account registered for ${
          capability.caveats.as
        } with email ${capability.with.replace('mailto:', '')}`,
      })
    }
  )
}
