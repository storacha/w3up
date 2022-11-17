import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { Delegation } from '@ucanto/core'
import { Failure } from '@ucanto/server'
/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherRedeemProvider(ctx) {
  return Server.provide(Voucher.redeem, async ({ capability, invocation }) => {
    if (capability.with !== ctx.signer.did()) {
      return new Failure(
        `Resource ${capability.with} does not service did ${ctx.signer.did()}`
      )
    }
    // @ts-ignore - TODO fix this
    await ctx.kvs.accounts.create(capability, invocation)

    // We should only save delegation for email identities
    if (capability.nb.identity.startsWith('mailto:')) {
      for (const p of invocation.proofs) {
        if (
          Delegation.isDelegation(p) &&
          p.audience.did() === ctx.signer.did()
        ) {
          await ctx.kvs.accounts.saveDelegation(capability.nb.identity, p)
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
