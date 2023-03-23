// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { Delegation } from '@ucanto/core'
import { Failure } from '@ucanto/server'
import { D1Error } from '../utils/d1.js'
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

    /** @type {Ucanto.Delegation<Ucanto.Capabilities>[]} */
    const delegations = []
    // We should only save delegation for email identities
    if (capability.nb.identity.startsWith('mailto:')) {
      for (const p of invocation.proofs) {
        if (
          Delegation.isDelegation(p) &&
          p.audience.did() === ctx.signer.did() &&
          p.capabilities[0].with === capability.nb.space &&
          p.capabilities[0].can === '*'
        ) {
          delegations.push(p)
        }
      }
    }

    if (delegations.length > 1) {
      return new Failure('Multiple space delegations not suppported.')
    }

    const { error } = await ctx.models.spaces.create(
      capability,
      // @ts-ignore - TODO fix this
      invocation,
      delegations[0]
    )

    if (error) {
      if (isSpaceAlreadyRegisteredError(error)) {
        return new Failure(`Space ${capability.nb.space} already registered.`)
      } else {
        throw error
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
  })
}

/**
 * @param {D1Error} error
 */
function isSpaceAlreadyRegisteredError(error) {
  if ('code' in error && error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return true
  }
  if (
    'cause' in error &&
    /UNIQUE constraint failed: spaces.did/.test(String(error.cause))
  ) {
    return true
  }
  return false
}
