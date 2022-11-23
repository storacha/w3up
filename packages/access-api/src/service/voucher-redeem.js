import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { Delegation } from '@ucanto/core'
import { Failure } from '@ucanto/server'
/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherRedeemProvider(ctx) {
  return Server.provide(Voucher.redeem, async ({ capability, invocation }) => {
    if (capability.with !== ctx.signer.did()) {
      return new Failure(
        `Resource ${
          capability.with
        } does not match service did ${ctx.signer.did()}`
      )
    }
    try {
      // @ts-ignore - TODO fix this
      await ctx.kvs.spaces.create(capability, invocation)

      // We should only save delegation for email identities
      if (capability.nb.identity.startsWith('mailto:')) {
        for (const p of invocation.proofs) {
          if (
            Delegation.isDelegation(p) &&
            p.audience.did() === ctx.signer.did()
          ) {
            await ctx.kvs.spaces.saveDelegation(capability.nb.identity, p)
          }
        }
      }

      ctx.config.METRICS.writeDataPoint({
        blobs: [ctx.config.ENV, 'new_space_v1'],
        doubles: [1],
      })

      if (ctx.config.ENV === 'production') {
        ctx.email.send({
          to: 'david@dag.house,jchris@dag.house',
          subject: 'New Space Created',
          textBody: `New space v1 registered for ${
            capability.nb.space
          } with email ${capability.nb.identity.replace('mailto:', '')}`,
        })
      }
    } catch (error) {
      const err = /** @type {import('../bindings').D1Error} */ (error)
      if (
        err.message === 'D1_ALL_ERROR' &&
        err.cause &&
        err.cause.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
      ) {
        return new Failure(`Space ${capability.nb.space} already registered.`)
      }

      throw err
    }
  })
}
