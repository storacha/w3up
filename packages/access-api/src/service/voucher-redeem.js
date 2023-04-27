// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Provider from '@ucanto/server'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { Delegation } from '@ucanto/core'
import { Failure } from '@ucanto/server'
import { D1Error } from '../utils/d1.js'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export const provide = (ctx) =>
  Provider.provide(Voucher.redeem, (input) => redeem(input, ctx))

/**
 * @param {Provider.ProviderInput<Provider.InferInvokedCapability<typeof Voucher.redeem>>} input
 * @param {import('../bindings').RouteContext} ctx
 */
export const redeem = async ({ capability, invocation }, ctx) => {
  if (capability.with !== ctx.signer.did()) {
    return {
      error: new Failure(
        `Resource ${
          capability.with
        } does not match service did ${ctx.signer.did()}`
      ),
    }
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
    return {
      error: new Failure('Multiple space delegations not suppported.'),
    }
  }

  const { error } = await ctx.models.spaces.create(
    capability,
    // @ts-ignore - TODO fix this
    invocation,
    delegations[0]
  )

  if (error) {
    if (isSpaceAlreadyRegisteredError(error)) {
      return {
        error: new Failure(`Space ${capability.nb.space} already registered.`),
      }
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

  return { ok: {} }
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
