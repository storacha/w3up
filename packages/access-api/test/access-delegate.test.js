import { context } from './helpers/context.js'
import * as Access from '@web3-storage/capabilities/access'
import * as assert from 'node:assert'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { delegate } from '@ucanto/core'

describe('access/delegate', function () {
  for (const [variantName, createInvocation] of Object.entries(
    namedDelegateVariants()
  )) {
    it(`handles invocation variant ${variantName}`, async () => {
      const { service, conn, issuer } = await context()
      const invocation = await createInvocation({ issuer, audience: service })
      const [result] = await conn.execute(invocation)
      assert.notDeepEqual(
        result.error,
        true,
        'invocation result is not an error'
      )
    })
  }
})

/**
 * @typedef {(options: { issuer: Ucanto.Signer<Ucanto.DID<'key'>>, audience: Ucanto.Principal }) => Promise<Ucanto.Delegation<[Ucanto.InferInvokedCapability<typeof Access.delegate>]>>} AccessDelegateInvocationFactory
 */

/**
 * create valid delegate invocation with an empty delegation set
 *
 * @type {AccessDelegateInvocationFactory}
 */
function withEmptyDelegationSet({ issuer, audience }) {
  return Access.delegate
    .invoke({
      issuer,
      audience,
      with: issuer.did(),
      nb: {
        delegations: {},
      },
    })
    .delegate()
}

/**
 * create a valid delegate invocation with a single delegation in nb.delegations set
 *
 * @type {AccessDelegateInvocationFactory}
 */
async function withSingleDelegation({ issuer, audience }) {
  return Access.delegate
    .invoke({
      issuer,
      audience,
      with: issuer.did(),
      nb: {
        delegations: {
          notACid: await delegate({
            issuer,
            audience,
            capabilities: [{ can: '*', with: 'urn:foo' }],
          }).then(({ cid }) => cid),
        },
      },
    })
    .delegate()
}

/**
 * @returns {Record<string, AccessDelegateInvocationFactory>}
 */
function namedDelegateVariants() {
  return {
    withEmptyDelegationSet,
    withSingleDelegation,
  }
}
