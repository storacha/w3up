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
        ...createTesterFromContext(() => context()),
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
  /*
  @todo: uncomment this testing against access-api + miniflare
  * after
    * get access/delegate handler working in prod w/ sql DelegationsStorage
      because otherwise there is nothing to access/claim
    * more tests on createAccessClaimHandler alone
      * ensure you can only claim things that are delegated to you, etc.
    * use createAccessClaimHandler inside of access-api ucanto service/server
  */
  // {
  //   name: 'handled by access-api in miniflare',
  //   ...createTesterFromContext(() => context()),
  // },
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
    const delegations = createDelegationsStorage()
    const handleAccessDelegate = createAccessDelegateHandler({
      delegations,
      hasStorageProvider: async (uri) => uri === alice.did(),
    })
    const result = await handleAccessDelegate(invocation)
    assertNotError(result, 'invocation result is not an error')
    assert.deepEqual(delegations.length, 1, '1 delegation was stored')
  })

  // "Provider SHOULD deny service if DID in the `with` field has no storage provider."
  // https://github.com/web3-storage/specs/blob/7e662a2d9ada4e3fc22a7a68f84871bff0a5380c/w3-access.md?plain=1#L94
  it('InsufficientStorage if DID in the `with` field has no storage provider', async () => {
    const alice = await principal.ed25519.generate()
    const w3 = await principal.ed25519.generate()
    const delegations = createDelegationsStorage()
    const handleAccessDelegate = createAccessDelegateHandler({
      delegations,
      // note: always returns false
      hasStorageProvider: async () => false,
    })
    const invocation = await Access.delegate
      .invoke({
        issuer: alice,
        audience: w3,
        with: alice.did(),
        nb: {
          delegations: {},
        },
      })
      .delegate()
    const result = await handleAccessDelegate(invocation)
    assert.ok(result.error, 'invocation result is an error')
    assert.deepEqual(result.name, 'InsufficientStorage')
    assert.ok(
      result.message.includes('has no storage provider'),
      'InsufficientStorage message indicates that it is because there is no storage provider'
    )
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
  const { delegate, claim, delegations } = await setupDelegateThenClaim(
    issuer,
    audience
  )
  const delegateResult = await invoke(delegate)
  warnOnErrorResult(delegateResult)
  assert.notDeepEqual(
    delegateResult.error,
    true,
    'result of access/delegate is not an error'
  )

  // delegate succeeded, now try to claim it
  const claimResult = await invoke(claim)
  assertNotError(claimResult)
  const claimedDelegations = [
    ...delegationsResponse.decode(
      /** @type {import('../src/service/access-claim.js').AccessClaimSuccess} */ (
        claimResult
      ).delegations
    ),
  ]
  assert.deepEqual(
    claimedDelegations,
    delegations,
    'claimed all delegated delegations'
  )
}

/**
 * @param {{ error?: unknown }} result
 * @param {string} assertionMessage
 */
function assertNotError(result, assertionMessage = 'result is not an error') {
  warnOnErrorResult(result)
  assert.notDeepEqual(result.error, true, assertionMessage)
}

/**
 * @param {{ error?: unknown }} result
 * @param {string} [message]
 * @param {(...loggables: any[]) => void} warn
 */
function warnOnErrorResult(
  result,
  message = 'unexpected error result',
  // eslint-disable-next-line no-console
  warn = console.warn.bind(console)
) {
  if (result.error) {
    warn(message, result)
  }
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
  const delegations = [aliceSaysBobCanStoreAllWithAlice]
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
