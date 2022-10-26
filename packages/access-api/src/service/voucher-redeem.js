import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { Delegation } from '@ucanto/core'
/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherRedeemProvider(ctx) {
  return Server.provide(Voucher.redeem, async ({ capability, invocation }) => {
    // @ts-ignore - TODO fix this
    await ctx.kvs.accounts.create(capability, invocation)

    // eslint-disable-next-line no-console
    console.log(
      '🚀 ~ file: voucher-redeem.js ~ line 14 ~ returnServer.provide ~ capability.nb.identity',
      capability.nb.identity
    )
    // We should only save delegation for redeems
    if (capability.nb.identity.startsWith('mailto:')) {
      for (const p of invocation.proofs) {
        // eslint-disable-next-line no-console
        console.log(
          'DELEGATION',
          Delegation.isDelegation(p),
          // @ts-ignore
          p.audience.did(),
          ctx.signer.did()
        )
        if (
          Delegation.isDelegation(p) &&
          p.audience.did() === ctx.signer.did()
        ) {
          await ctx.kvs.accounts.saveAccount(capability.nb.identity, p)
        }
      }
    }

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
