import { context } from './helpers/context.js'
import * as Access from '@web3-storage/capabilities/access'
import * as assert from 'node:assert'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import * as principal from '@ucanto/principal'
import { createAccessDelegateHandler } from '../src/service/access-delegate.js'
import { createAccessClaimHandler } from '../src/service/access-claim.js'

for (const tester of /** @type {const} */ ([
  {
    name: 'handled by access-api in miniflare',
    ...createTesterFromContext(() => context()),
  },
  {
    name: 'handled by access-delegate-handler',
    ...createTesterFromHandler(() => createAccessDelegateHandler()),
  },
])) {
  describe(`access/delegate ${tester.name}`, () => {
    // test common variants of access/delegate invocation
    for (const [variantName, createTest] of Object.entries(
      namedDelegateVariants()
    )) {
      it(`handles variant ${variantName}`, async () => {
        const { issuer, audience, invoke } = tester
        const { invocation, check } = await createTest({ issuer, audience })
        /** @type {Ucanto.Result<unknown, { error: true }>} */
        const result = await invoke(invocation)
        if (typeof check === 'function') {
          await check(result)
        }
        assert.notDeepEqual(
          result.error,
          true,
          'invocation result is not an error'
        )
      })
    }
  })
}

for (const tester of /** @type {const} */ ([
  {
    name: 'handled by createAccessHandler',
    ...createTesterFromHandler(() =>
      createAccessHandler(
        createAccessDelegateHandler(),
        createAccessClaimHandler()
      )
    ),
  },
])) {
  describe(`access/delegate ${tester.name}`, () => {
    // test delegate, then claim
    it('can delegate, then claim', async () => {
      await testCanDelegateThenClaim(
        tester.invoke,
        await tester.issuer,
        await tester.audience
      )
    })
  })
}

/**
 * Tests using context from "./helpers/context.js", which sets up a testable access-api inside miniflare.
 *
 * @param {() => Promise<{ issuer: Ucanto.Signer<Ucanto.DID<'key'>>, service: Ucanto.Signer<Ucanto.DID>, conn: Ucanto.ConnectionView<Record<string, any>> }>} createContext
 */
function createTesterFromContext(createContext) {
  const context = createContext()
  const issuer = context.then(({ issuer }) => issuer)
  const audience = context.then(({ service }) => service)
  /**
   * @template {Ucanto.Capability} Capability
   * @param {Ucanto.Invocation<Capability>} invocation
   */
  const invoke = async (invocation) => {
    const { conn } = await context
    const [result] = await conn.execute(invocation)
    return result
  }
  return { issuer, audience, invoke }
}

/**
 * @template {Ucanto.Capability} Capability
 * @template Result
 * @typedef {object} InvokeTester
 * @property {(invocation: Ucanto.Invocation<Capability>) => Promise<Result>} invoke
 * @property {Resolvable<Ucanto.Signer<Ucanto.DID<'key'>>>} issuer
 * @property {Resolvable<Ucanto.Verifier<Ucanto.DID>>} audience
 */

/**
 * Tests using simple function invocation -> result
 *
 * @template {Ucanto.Capability} Capability
 * @template Result
 * @param {() => (invocation: Ucanto.Invocation<Capability>) => Promise<Result>} createHandler
 * @returns {InvokeTester<Capability, Result>}
 */
function createTesterFromHandler(createHandler) {
  const issuer = principal.ed25519.generate()
  const audience = principal.ed25519.generate()
  /**
   * @param {Ucanto.Invocation<Capability>} invocation
   */
  const invoke = async (invocation) => {
    const handle = createHandler()
    const result = await handle(invocation)
    return result
  }
  return { issuer, audience, invoke }
}

/**
 * a value that can be passed to Promise.resolve() to get Promise<T>
 *
 * @template T
 * @typedef {T | Promise<T>} Resolvable
 */

/**
 * @typedef InvocationContext
 * @property {Resolvable<Ucanto.Signer<Ucanto.DID<'key'>>>} issuer
 * @property {Resolvable<Ucanto.Principal>} audience
 */

/**
 * @template {Ucanto.CapabilityParser<Ucanto.Match<Ucanto.ParsedCapability>>} CapabilityParser
 * @template [Success=unknown]
 * @typedef InvocationTest
 * @property {Ucanto.Invocation<Ucanto.InferInvokedCapability<CapabilityParser>>} invocation
 * @property {(result: Ucanto.Result<Success, { error: true }>) => Resolvable<void>} [check] - check the result of the invocation. throw if not valid
 */

/**
 * @template {Ucanto.CapabilityParser<Ucanto.Match<Ucanto.ParsedCapability>>} CapabilityParser
 * @template [Success=unknown]
 * @typedef {(options: InvocationContext) => Promise<InvocationTest<CapabilityParser, Success>>} InvocationTestCreator
 */

/**
 * create valid delegate invocation with an empty delegation set
 *
 * @type {InvocationTestCreator<typeof Access.delegate>}
 */
async function withEmptyDelegationSet({ issuer, audience }) {
  const invocation = await Access.delegate
    .invoke({
      issuer: await issuer,
      audience: await audience,
      with: await Promise.resolve(issuer).then((i) => i.did()),
      nb: {
        delegations: {},
      },
    })
    .delegate()
  return { invocation }
}

/**
 * create a valid delegate invocation with a single delegation in nb.delegations set
 *
 * @type {InvocationTestCreator<typeof Access.delegate>}
 */
async function withSingleDelegation({ issuer, audience }) {
  const delegation = await ucanto.delegate({
    issuer: await issuer,
    audience: await audience,
    capabilities: [{ can: '*', with: 'urn:foo' }],
  })
  const invocation = await Access.delegate
    .invoke({
      issuer: await issuer,
      audience: await audience,
      with: await Promise.resolve(issuer).then((i) => i.did()),
      nb: {
        delegations: {
          notACid: delegation.cid,
        },
      },
      proofs: [delegation],
    })
    .delegate()
  return { invocation }
}

/**
 * @returns {Record<string, InvocationTestCreator<typeof Access.delegate>>}
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

/**
 * @template {Ucanto.Capability} Capability
 * @template [Success=unknown]
 * @template {{ error: true }} [Failure=Ucanto.Failure]
 * @typedef {(invocation: Ucanto.Invocation<Capability>) => Promise<Ucanto.Result<Success, Failure>>} InvocationHandler
 */

/**
 * @param {InvocationHandler<AccessDelegate | AccessClaim, unknown, { error: true }>} invoke
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} issuer
 * @param {Ucanto.Verifier<Ucanto.DID>} audience
 */
async function testCanDelegateThenClaim(invoke, issuer, audience) {
  const { delegate, claim } = await setupDelegateThenClaim(issuer, audience)
  const delegateResult = await invoke(delegate)
  assert.notDeepEqual(
    delegateResult.error,
    true,
    'result of access/delegate is not an error'
  )

  // delegate succeeded, now try to claim it
  const claimResult = await invoke(claim)
  assert.notDeepEqual(
    claimResult.error,
    true,
    'result of access/claim is not an error'
  )
  // @todo enable this assertion once we have access/claim results
  // assert.deepEqual(
  //   Object.values(/** @type {any} */ (claimResult).delegations).length,
  //   Object.values(delegate.capabilities[0].nb.delegations).length,
  //   'claimed same number of delegations as were delegated'
  // )
}

/**
 * setup test scenario testing that an access/delegate can be followed up by access/claim.
 *
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} invoker
 * @param {Ucanto.Verifier<Ucanto.DID>} audience
 */
async function setupDelegateThenClaim(invoker, audience) {
  const alice = await principal.ed25519.generate()
  const bob = await principal.ed25519.generate()
  const aliceSaysBobCanStoreAllWithAlice = await ucanto.delegate({
    issuer: alice,
    audience: bob,
    capabilities: [{ can: 'store/*', with: alice.did() }],
  })
  // invocation of access/delegate
  const delegate = await Access.delegate
    .invoke({
      issuer: invoker,
      audience,
      with: invoker.did(),
      nb: {
        delegations: {
          notACid: aliceSaysBobCanStoreAllWithAlice.cid,
        },
      },
      proofs: [aliceSaysBobCanStoreAllWithAlice],
    })
    .delegate()
  // invocation of access/claim that should claim the delegations
  // claim as bob, since bob is the audience of `aliceSaysBobCanStoreAllWithAlice`
  const claim = await Access.claim
    .invoke({
      issuer: invoker,
      audience,
      with: invoker.did(),
      proofs: [],
    })
    .delegate()
  return { delegate, claim }
}

/**
 * @typedef {Ucanto.InferInvokedCapability<typeof Access.claim>} AccessClaim
 * @typedef {Ucanto.InferInvokedCapability<typeof Access.delegate>} AccessDelegate
 */

/**
 * @param {import('../src/service/access-delegate.js').AccessDelegateHandler} handleDelegate
 * @param {InvocationHandler<AccessClaim, unknown, { error: true }>} handleClaim
 * @returns {InvocationHandler<AccessDelegate | AccessClaim, unknown, { error: true }>}
 */
function createAccessHandler(handleDelegate, handleClaim) {
  return async (invocation) => {
    const can = invocation.capabilities[0].can
    switch (can) {
      case 'access/claim': {
        return handleClaim(
          /** @type {Ucanto.Invocation<AccessClaim>} */ (invocation)
        )
      }
      case 'access/delegate': {
        return handleDelegate(
          /** @type {Ucanto.Invocation<AccessDelegate>} */ (invocation)
        )
      }
      default: {
        // eslint-disable-next-line no-void
        void (/** @type {never} */ (can))
      }
    }
    throw new Error(`unexpected can=${can}`)
  }
}
