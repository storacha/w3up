import { context } from './helpers/context.js'
import * as Access from '@web3-storage/capabilities/access'
import * as assert from 'node:assert'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import * as principal from '@ucanto/principal'
import { createAccessDelegateHandler } from '../src/service/access-delegate.js'
import { createAccessClaimHandler } from '../src/service/access-claim.js'
import {
  createDelegationsStorage,
  toDelegationsDict,
} from '../src/service/delegations.js'
import { createD1Database } from '../src/utils/d1.js'
import { DbDelegationsStorage } from '../src/models/delegations.js'
import * as delegationsResponse from '../src/utils/delegations-response.js'
import {
  assertNotError,
  createTesterFromContext,
  warnOnErrorResult,
} from './helpers/ucanto-test-utils.js'

/**
 * Run the same tests against several variants of access/delegate handlers.
 */
for (const handlerVariant of /** @type {const} */ ([
  {
    name: 'handled by access-api in miniflare',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromContext(() => context(), {
          registerSpaces: [spaceWithStorageProvider],
        }),
      }
    })(),
  },
  {
    name: 'handled by access-delegate-handler',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromHandler(() =>
          createAccessDelegateHandler({
            hasStorageProvider: async (uri) => {
              return (
                uri === (await spaceWithStorageProvider.then((s) => s.did()))
              )
            },
          })
        ),
      }
    })(),
  },
])) {
  describe(`access/delegate ${handlerVariant.name}`, () => {
    // test common variants of access/delegate invocation
    for (const [variantName, createTest] of Object.entries(
      namedDelegateVariants({
        spaceWithStorageProvider: handlerVariant.spaceWithStorageProvider,
      })
    )) {
      it(`handles variant ${variantName}`, async () => {
        const { issuer, audience, invoke } = handlerVariant
        const { invocation, check } = await createTest({ issuer, audience })
        /** @type {Ucanto.Result<unknown, { error: true }>} */
        const result = await invoke(invocation)
        if (typeof check === 'function') {
          await check(result)
        }
        assertNotError(result)
      })
    }

    it(`InsufficientStorage if DID in the with field has no storage provider`, async () => {
      await testInsufficientStorageIfNoStorageProvider(handlerVariant)
    })
  })
}

/**
 * Run the same tests against several variants of ( access/delegate | access/claim ) handlers.
 */
for (const variant of /** @type {const} */ ([
  {
    name: 'handled by createAccessHandler using array createDelegationsStorage',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromHandler(
          (() => {
            const delegations = createDelegationsStorage()
            return () => {
              return createAccessHandler(
                createAccessDelegateHandler({
                  delegations,
                  hasStorageProvider: async (uri) => {
                    return (
                      uri ===
                      (await spaceWithStorageProvider.then((s) => s.did()))
                    )
                  },
                }),
                createAccessClaimHandler({ delegations })
              )
            }
          })()
        ),
      }
    })(),
  },
  {
    name: 'handled by createAccessHandler using DbDelegationsStorage',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      const d1 = context().then((ctx) => ctx.d1)
      const database = d1.then((d1) => createD1Database(d1))
      const delegations = database.then((db) => new DbDelegationsStorage(db))
      return {
        spaceWithStorageProvider,
        ...createTesterFromHandler(
          (() => {
            return () => {
              /**
               * @type {InvocationHandler<AccessDelegate | AccessClaim, unknown, { error: true }>}
               */
              return async (invocation) => {
                const handle = createAccessHandler(
                  createAccessDelegateHandler({
                    delegations: await delegations,
                    hasStorageProvider: async (uri) => {
                      return (
                        uri ===
                        (await spaceWithStorageProvider.then((s) => s.did()))
                      )
                    },
                  }),
                  createAccessClaimHandler({ delegations: await delegations })
                )
                return handle(invocation)
              }
            }
          })()
        ),
      }
    })(),
  },
  {
    name: 'handled by access-api in miniflare',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromContext(() => context(), {
          registerSpaces: [spaceWithStorageProvider],
        }),
      }
    })(),
  },
])) {
  describe(`access/delegate ${variant.name}`, () => {
    // test delegate, then claim
    it('can delegate, then claim', async () => {
      await testCanDelegateThenClaim(
        variant.invoke,
        await variant.spaceWithStorageProvider,
        await variant.audience
      )
    })
  })
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
 * @param {object} options
 * @param {Promise<Ucanto.Signer<Ucanto.DID<'key'>>>} options.spaceWithStorageProvider
 * @returns {InvocationTestCreator<typeof Access.delegate>}
 */
function createTestWithSpaceAndEmptyDelegationSet(options) {
  /**
   * create valid delegate invocation with an empty delegation set
   *
   * @type {InvocationTestCreator<typeof Access.delegate>}
   */
  return async function (invocationOptions) {
    const issuer = await invocationOptions.issuer
    const audience = await invocationOptions.audience
    const spaceWithStorageProvider = await options.spaceWithStorageProvider
    const authorizationToDelegate = await Access.delegate.delegate({
      issuer: spaceWithStorageProvider,
      audience: issuer,
      with: spaceWithStorageProvider.did(),
    })
    const invocation = await Access.delegate
      .invoke({
        issuer,
        audience,
        with: spaceWithStorageProvider.did(),
        nb: {
          delegations: {},
        },
        proofs: [authorizationToDelegate],
      })
      .delegate()
    return { invocation }
  }
}

/**
 * @param {object} options
 * @param {Promise<Ucanto.Signer<Ucanto.DID<'key'>>>} options.spaceWithStorageProvider
 * @param {(options: { issuer: Ucanto.Signer<Ucanto.DID<'key'>> }) => Resolvable<Iterable<Ucanto.Delegation>>} options.delegations - delegations to delegate vi access/delegate .nb.delegations
 * @returns {InvocationTestCreator<typeof Access.delegate>}
 */
function createTestWithSpace(options) {
  return async function (invocationOptions) {
    const issuer = await invocationOptions.issuer
    const audience = await invocationOptions.audience
    const spaceWithStorageProvider = await options.spaceWithStorageProvider
    const authorizationToDelegate = await Access.top.delegate({
      issuer: spaceWithStorageProvider,
      audience: issuer,
      with: spaceWithStorageProvider.did(),
    })
    const delegations = [...(await options.delegations({ issuer }))]
    const invocation = await Access.delegate
      .invoke({
        issuer,
        audience,
        with: spaceWithStorageProvider.did(),
        nb: {
          delegations: toDelegationsDict(delegations),
        },
        proofs: [authorizationToDelegate, ...delegations],
      })
      .delegate()
    return { invocation }
  }
}

/**
 * @param {object} options
 * @param {Promise<Ucanto.Signer<Ucanto.DID<'key'>>>} options.spaceWithStorageProvider
 * @returns {Record<string, InvocationTestCreator<typeof Access.delegate>>}
 */
function namedDelegateVariants({ spaceWithStorageProvider }) {
  return {
    withSpaceAndEmptyDelegationSet: createTestWithSpaceAndEmptyDelegationSet({
      spaceWithStorageProvider,
    }),
    withSpaceAndSingleDelegation: createTestWithSpace({
      spaceWithStorageProvider,
      delegations: async ({ issuer }) => {
        return [
          await ucanto.delegate({
            issuer,
            audience: issuer,
            capabilities: [{ can: '*', with: 'did:web:example.com' }],
          }),
        ]
      },
    }),
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
    const delegations = createDelegationsStorage()
    const handleAccessDelegate = createAccessDelegateHandler({
      delegations,
      hasStorageProvider: async (uri) => {
        return uri === alice.did()
      },
    })
    await assert.rejects(handleAccessDelegate(invocation), 'UnknownDelegation')
    assert.deepEqual(await delegations.count(), 0, '0 delegations were stored')
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
    const delegations = createDelegationsStorage()
    const handleAccessDelegate = createAccessDelegateHandler({
      delegations,
      hasStorageProvider: async (uri) => uri === alice.did(),
    })
    const result = await handleAccessDelegate(invocation)
    assertNotError(result, 'invocation result is not an error')
    assert.deepEqual(await delegations.count(), 1, '1 delegation was stored')
  })

  // "Provider SHOULD deny service if DID in the `with` field has no storage provider."
  // https://github.com/web3-storage/specs/blob/7e662a2d9ada4e3fc22a7a68f84871bff0a5380c/w3-access.md?plain=1#L94
  it('InsufficientStorage if DID in the `with` field has no storage provider', async () => {
    await testInsufficientStorageIfNoStorageProvider({
      audience: await principal.ed25519.generate(),
      invoke: createAccessDelegateHandler({
        delegations: createDelegationsStorage(),
        // note: always returns false
        hasStorageProvider: async () => false,
      }),
    })
  })
})

/**
 * @param {object} options
 * @param {Resolvable<Ucanto.Principal>} options.audience
 * @param {(inv: Ucanto.Invocation<AccessDelegate>) => Promise<Ucanto.Result<unknown, { error: true } | Ucanto.Failure >>} options.invoke
 */
async function testInsufficientStorageIfNoStorageProvider(options) {
  const alice = await principal.ed25519.generate()
  const invocation = await Access.delegate
    .invoke({
      issuer: alice,
      audience: await options.audience,
      with: alice.did(),
      nb: {
        delegations: {},
      },
    })
    .delegate()
  const result = await options.invoke(invocation)
  assert.ok(result.error, 'invocation result.error is truthy')
  assert.ok('name' in result, 'result has a .name property')
  assert.deepEqual(result.name, 'InsufficientStorage')
  assert.ok(
    result.message.includes('has no storage provider'),
    'InsufficientStorage message indicates that it is because there is no storage provider'
  )
}

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
  const setup = await setupDelegateThenClaim(issuer, audience)
  const { delegate } = setup
  const delegateResult = await invoke(delegate)
  warnOnErrorResult(delegateResult)
  assert.notDeepEqual(
    delegateResult.error,
    true,
    'result of access/delegate is not an error'
  )

  // delegate succeeded, now try to claim it
  const { claim } = setup
  const claimResult = await invoke(claim)
  assertNotError(claimResult)
  const claimedDelegations = [
    ...delegationsResponse.decode(
      /** @type {import('../src/service/access-claim.js').AccessClaimSuccess} */ (
        claimResult
      ).delegations
    ),
  ]
  const { delegations } = setup
  assert.deepEqual(
    claimedDelegations,
    delegations,
    'claimed all delegated delegations'
  )
}

/**
 * setup test scenario testing that an access/delegate can be followed up by access/claim.
 *
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} invoker
 * @param {Ucanto.Verifier<Ucanto.DID>} audience
 */
async function setupDelegateThenClaim(invoker, audience) {
  const alice = await principal.ed25519.generate()
  const aliceSaysInvokerCanStoreAllWithAlice = await ucanto.delegate({
    issuer: alice,
    audience: invoker,
    capabilities: [{ can: 'store/*', with: alice.did() }],
  })
  const delegations = [aliceSaysInvokerCanStoreAllWithAlice]
  // invocation of access/delegate
  const delegate = await Access.delegate
    .invoke({
      issuer: invoker,
      audience,
      with: invoker.did(),
      nb: {
        delegations: toDelegationsDict(delegations),
      },
      proofs: delegations,
    })
    .delegate()
  // invocation of access/claim that should claim the delegations
  // claim as invoker, since invoker is the audience of `aliceSaysInvokerCanStoreAllWithAlice`
  const claim = await Access.claim
    .invoke({
      issuer: invoker,
      audience,
      with: invoker.did(),
      proofs: [],
    })
    .delegate()
  return { delegate, claim, delegations }
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
