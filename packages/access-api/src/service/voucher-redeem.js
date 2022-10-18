import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/access/capabilities/voucher'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherRedeemProvider(ctx) {
  return Server.provide(Voucher.redeem, async ({ capability, invocation }) => {
    await ctx.db.insert({
      tableName: 'accounts',
      data: {
        did: capability.nb.account,
        product: capability.nb.product,
        email: capability.nb.identity.replace('mailto:', ''),
        agent: invocation.issuer.did(),
      },
    })

    ctx.config.METRICS.writeDataPoint({
      blobs: [ctx.config.ENV, 'new_account_v1'],
      doubles: [1],
    })

    if (ctx.config.ENV === 'production') {
      ctx.email.send({
        to: 'david@dag.house,jchris@dag.house',
        subject: 'New w3account Created',
        textBody: `New account v1 registered for ${
          capability.nb.account
        } with email ${capability.nb.identity.replace('mailto:', '')}`,
      })
    }
  })
}
