import { context } from './helpers/context.js'
import * as Access from '@web3-storage/capabilities/access'
import * as assert from 'node:assert'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import * as principal from '@ucanto/principal'
import { createAccessDelegateHandler } from '../src/service/access-delegate.js'

describe('access-api handling access/delegate', function () {
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
          notACid: await ucanto
            .delegate({
              issuer,
              audience,
              capabilities: [{ can: '*', with: 'urn:foo' }],
            })
            .then(({ cid }) => cid),
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

describe('access-delegate-handler', () => {
  it('UnknownDelegation when invoked with nb.delegations not included in proofs', async () => {
    const alice = await principal.ed25519.generate()
    const bob = await principal.ed25519.generate()
    const delegated = await ucanto.delegate({
      issuer: alice,
      audience: alice,
      capabilities: [{ can: '*', with: 'urn:foo' }],
    })
    const invocation = await Access.delegate
      .invoke({
        issuer: alice,
        audience: bob,
        with: alice.did(),
        nb: {
          delegations: {
            notACid: delegated.cid,
          },
        },
        // note: empty!
        proofs: [],
      })
      .delegate()
    /** @type {import('../src/service/access-delegate.js').DelegationsStorage} */
    const delegations = []
    const handleAccessDelegate = createAccessDelegateHandler({ delegations })
    await assert.rejects(handleAccessDelegate(invocation), 'UnknownDelegation')
    assert.deepEqual(delegations.length, 0, '0 delegations were stored')
  })
  it('stores delegations', async () => {
    const alice = await principal.ed25519.generate()
    const bob = await principal.ed25519.generate()
    const delegated = await ucanto.delegate({
      issuer: alice,
      audience: alice,
      capabilities: [{ can: '*', with: 'urn:foo' }],
    })
    const invocation = await Access.delegate
      .invoke({
        issuer: alice,
        audience: bob,
        with: alice.did(),
        nb: {
          delegations: {
            notACid: delegated.cid,
          },
        },
        proofs: [delegated],
      })
      .delegate()
    /** @type {import('../src/service/access-delegate.js').DelegationsStorage} */
    const delegations = []
    const handleAccessDelegate = createAccessDelegateHandler({ delegations })
    const result = await handleAccessDelegate(invocation)
    assert.notDeepEqual(result.error, true, 'invocation result is not an error')
    assert.deepEqual(delegations.length, 1, '1 delegation was stored')
  })
})
