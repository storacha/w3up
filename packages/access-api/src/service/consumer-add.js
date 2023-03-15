import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as validator from '@ucanto/validator'
import * as CBOR from '@ucanto/transport/cbor/codec'

/**
 * @callback ProviderAddHandler
 * @param {Ucanto.Invocation<Capabilities.ConsumerAdd>} invocation
 * @returns {Promise<Ucanto.Result<Capabilities.ConsumerAddSuccess, Capabilities.ConsumerAddFailure>>}
 */

/**
 * @param {object} options
 * @param {import('../types/consumers').ConsumerStore} options.consumers
 * @returns {ProviderAddHandler}
 */
export function createProviderAddHandler(options) {
  /** @type {ProviderAddHandler} */
  return async (invocation) => {
    const [providerAddCap] = invocation.capabilities
    const {
      nb: { consumer },
      with: accountDID,
    } = providerAddCap
    if (!validator.DID.match({ method: 'mailto' }).is(accountDID)) {
      return {
        error: true,
        name: 'Unauthorized',
        message: 'Issuer must be a mailto DID',
      }
    }

    // derive the order id as a CID of the `{ account }` as we limit provider
    // to be one per account.
    const { cid } = await CBOR.write({ account: accountDID })
    const order = cid.toString()

    await options.provisions.putMany({
      invocation,
      consumer,
      provider,
      order,
    })
    return {}
  }
}

/**
 * @typedef {object} Context
 * @property {import('../types/consumers').ConsumerStore} options.consumers
 * @property {Ucanto.Signer} signer
 * @property {Ucanto.Principal} principal
 *
 * @param {object} input
 * @param {Ucanto.Invocation<Capabilities.ConsumerAdd>} input.invocation
 * @param {Context} input.context
 */
export const add = async ({ invocation, context }) => {
  const [
    {
      with: provider,
      nb: { consumer, order },
    },
  ] = invocation.capabilities

  // At the moment, we only support DID corresponding to our own DID.
  if (provider !== context.principal.did()) {
    return {
      error: true,
      name: 'UnknownProvider',
      provider,
      message: `Provider ${provider} is not known to this service`,
    }
  }

  context.consumers.add({
    cause: invocation.cid,
    consumer,
    provider,
    order,
  })

  await context.provisions.putMany({
    invocation,
    consumer,
    provider,
    order,
  })
  return {}
}

/**
 * @param {object} ctx
 * @param {Pick<import('../bindings').RouteContext['models'], 'provisions'>} ctx.models
 */
export function providerAddProvider(ctx) {
  return Server.provide(Provider.add, async ({ invocation, context }) => {
    const handler = createProviderAddHandler({
      provisions: ctx.models.provisions,
    })
    return handler(/** @type {Ucanto.Invocation<ProviderAdd>} */ (invocation))
  })
}
