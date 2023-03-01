import {
  assertNotError,
  createTesterFromContext,
  createTesterFromHandler,
  warnOnErrorResult,
} from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import * as provider from '@web3-storage/capabilities/provider'
import * as assert from 'assert'
import { createProviderAddHandler } from '../src/service/provider-add.js'
import { context } from './helpers/context.js'
import * as ucanto from '@ucanto/core'
import * as Ucanto from '@ucanto/interface'
import { Access, Provider } from '@web3-storage/capabilities'
import * as delegationsResponse from '../src/utils/delegations-response.js'
import { createStorageProvisions } from '../src/models/storage-provisions.js'

for (const providerAddHandlerVariant of /** @type {const} */ ([
  {
    name: 'handled by createProviderAddHandler',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      const storageProvisions = createStorageProvisions()
      return {
        spaceWithStorageProvider,
        storageProvisions,
        ...createTesterFromHandler(() =>
          createProviderAddHandler({
            storageProvisions,
          })
        ),
      }
    })(),
  },
])) {
  describe(`provider/add ${providerAddHandlerVariant.name}`, () => {
    it(`can be invoked by did:key`, async () => {
      const space = await principal.ed25519.generate()
      const issuer = await providerAddHandlerVariant.issuer
      const result = await providerAddHandlerVariant.invoke(
        await provider.add
          .invoke({
            issuer,
            audience: await providerAddHandlerVariant.audience,
            with: `did:mailto:example.com:foo`,
            nb: {
              consumer: space.did(),
              provider: 'did:web:web3.storage:providers:w3up-alpha',
            },
          })
          .delegate()
      )
      assertNotError(result)
    })
    it(`can be invoked by did:mailto w/ session ./update`, async () => {
      const agentA = await principal.ed25519.generate()
      const accountDID = /** @type {Ucanto.DID<'mailto'>} */ (
        'did:mailto:example.com:foo'
      )
      const account = { did: () => accountDID }
      const space = await principal.ed25519.generate()
      const service = await providerAddHandlerVariant.audience
      const agentACanSignAsAccountDID = await ucanto.delegate({
        issuer: service,
        audience: account,
        capabilities: [
          {
            with: service.did(),
            can: './update',
            nb: {
              key: agentA.did(),
            },
          },
        ],
      })
      const providerAddition = await providerAddHandlerVariant.invoke(
        await provider.add
          .invoke({
            issuer: agentA.withDID(accountDID),
            audience: service,
            with: account.did(),
            nb: {
              consumer: space.did(),
              provider: 'did:web:web3.storage:providers:w3up-alpha',
            },
            proofs: [agentACanSignAsAccountDID],
          })
          .delegate()
      )
      assertNotError(providerAddition)
      assert.deepEqual(
        providerAddHandlerVariant.storageProvisions.hasStorageProvider(
          space.did()
        ),
        true,
        'provider/add invocation resulted in spaceHasStorageProvider true'
      )
    })
  })
}

for (const accessApiVariant of /** @type {const} */ ([
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
  describe(`provider/add ${accessApiVariant.name}`, () => {
    it(`can invoke as did:mailto after authorize confirmation`, async () => {
      await testAuthorizeClaimProviderAdd({
        deviceA: await principal.ed25519.generate(),
        accountA: {
          did: () => /** @type {const} */ (`did:mailto:example.com:foo`),
        },
        space: await principal.ed25519.generate(),
        invoke: accessApiVariant.invoke,
        service: await accessApiVariant.audience,
        miniflare: await accessApiVariant.miniflare,
      })
    })
  })
}

/**
 * @param {object} options
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.deviceA
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} options.accountA
 * @param {Ucanto.Principal} options.service - web3.storage service
 * @param {import('miniflare').Miniflare} options.miniflare
 * @param {(invocation: Ucanto.Invocation<Ucanto.Capability>) => Promise<unknown>} options.invoke
 */
async function testAuthorizeClaimProviderAdd(options) {
  const { accountA, deviceA, miniflare, service, space } = options
  // authorize
  const confirmationUrl = await options.invoke(
    await Access.authorize
      .invoke({
        issuer: deviceA,
        audience: service,
        with: deviceA.did(),
        nb: {
          as: accountA.did(),
        },
      })
      .delegate()
  )
  assert.ok(typeof confirmationUrl === 'string', 'confirmationUrl is string')
  const confirmEmailPostResponse = await miniflare.dispatchFetch(
    new URL(confirmationUrl),
    { method: 'POST' }
  )
  assert.deepEqual(
    confirmEmailPostResponse.status,
    200,
    'confirmEmailPostResponse status is 200'
  )

  // claim as deviceA
  const claimAsDeviceAResult = await options.invoke(
    await Access.claim
      .invoke({
        issuer: deviceA,
        audience: service,
        with: deviceA.did(),
      })
      .delegate()
  )
  assert.ok(
    claimAsDeviceAResult && typeof claimAsDeviceAResult === 'object',
    `claimAsDeviceAResult is an object`
  )
  warnOnErrorResult(claimAsDeviceAResult)
  assert.ok(
    'delegations' in claimAsDeviceAResult &&
      typeof claimAsDeviceAResult.delegations === 'object' &&
      claimAsDeviceAResult.delegations,
    'claimAsDeviceAResult should have delegations property'
  )
  const claimedDelegations = [
    ...delegationsResponse.decode(
      /** @type {Record<string,Ucanto.ByteView<Ucanto.Delegation>>} */ (
        claimAsDeviceAResult.delegations
      )
    ),
  ]
  assert.deepEqual(claimedDelegations.length, 1)
  const [sessionEnvelope] = claimedDelegations
  assert.deepEqual(sessionEnvelope.capabilities.length, 1)
  assert.deepEqual(
    sessionEnvelope.proofs.length,
    1,
    'session envelope has session delegation as proof'
  )
  const [session] = sessionEnvelope.proofs
  assert.ok('cid' in session, 'session proof is whole delegation not link')
  assert.deepEqual(session.capabilities.length, 1, 'session has a capability')
  assert.deepEqual(
    session.capabilities[0].can,
    './update',
    'session capability is ./update'
  )
  assert.deepEqual(
    session.capabilities[0].with,
    service.did(),
    'session capability with is service'
  )

  // provider/add
  const providerAddAsAccountResult = await options.invoke(
    await Provider.add
      .invoke({
        issuer: deviceA.withDID(accountA.did()),
        audience: service,
        with: accountA.did(),
        nb: {
          provider: 'did:web:web3.storage:providers:w3up-alpha',
          consumer: space.did(),
        },
        proofs: [session],
      })
      .delegate()
  )
  assert.ok(
    providerAddAsAccountResult &&
      typeof providerAddAsAccountResult === 'object',
    `providerAddAsAccountResult is an object`
  )
  assertNotError(providerAddAsAccountResult)

  const spaceStorageResult = await options.invoke(
    await ucanto
      .invoke({
        issuer: space,
        audience: service,
        capability: {
          can: 'testing/space-storage',
          with: space.did(),
        },
      })
      .delegate()
  )
  assert.ok(
    spaceStorageResult &&
      typeof spaceStorageResult === 'object' &&
      'hasStorageProvider' in spaceStorageResult,
    'spaceStorageResult has hasStorageProvider property'
  )
  // assert.deepEqual(
  //   spaceStorageResult.hasStorageProvider,
  //   true,
  //   `testing/space-storage.hasStorageProvider is true`
  // )
}
