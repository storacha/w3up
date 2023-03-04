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
import { createProvisions } from '../src/models/provisions.js'
import { Email } from '../src/utils/email.js'

for (const providerAddHandlerVariant of /** @type {const} */ ([
  {
    name: 'handled by createProviderAddHandler',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      const provisions = createProvisions()
      return {
        spaceWithStorageProvider,
        provisions,
        ...createTesterFromHandler(() =>
          createProviderAddHandler({
            provisions,
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
  })
}

for (const accessApiVariant of /** @type {const} */ ([
  {
    name: 'handled by access-api in miniflare',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      /** @type {{to:string, url:string}[]} */
      const emails = []
      const email = createEmail(emails)
      return {
        spaceWithStorageProvider,
        emails,
        ...createTesterFromContext(
          () =>
            context({
              globals: {
                email,
              },
            }),
          {
            registerSpaces: [spaceWithStorageProvider],
          }
        ),
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
        emails: accessApiVariant.emails,
        miniflare: await accessApiVariant.miniflare,
      })
    })
  })
}

/**
 * @typedef {import('../src/utils/email.js').ValidationEmailSend} ValidationEmailSend
 */

/**
 *
 * @param {Pick<Array<ValidationEmailSend>, 'push'>} storage
 * @returns {Pick<Email, 'sendValidation'>}
 */
export function createEmail(storage) {
  const email = {
    /**
     * @param {ValidationEmailSend} email
     */
    async sendValidation(email) {
      storage.push(email)
    },
  }
  return email
}

/**
 * @param {object} options
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.deviceA
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} options.accountA
 * @param {Ucanto.Principal} options.service - web3.storage service
 * @param {import('miniflare').Miniflare} options.miniflare
 * @param {(invocation: Ucanto.Invocation<Ucanto.Capability>) => Promise<unknown>} options.invoke
 * @param {ValidationEmailSend[]} options.emails
 */
async function testAuthorizeClaimProviderAdd(options) {
  const { accountA, deviceA, miniflare, service, space, emails } = options
  // authorize
  await options.invoke(
    await Access.authorize
      .invoke({
        issuer: deviceA,
        audience: service,
        with: deviceA.did(),
        nb: {
          att: [{ can: '*' }],
          iss: accountA.did(),
        },
      })
      .delegate()
  )
  const validationEmail = emails.at(-1)
  assert.ok(validationEmail, 'has email after authorize')

  const confirmationUrl = validationEmail.url
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
  assert.ok(claimedDelegations.length > 0)
  const claimedDelegationIssuedByService = claimedDelegations.find((d) => {
    if (!('cid' in d)) {
      throw new Error('proof must be delegation')
    }
    return d.issuer.did() === service.did()
  })
  assert.ok(
    claimedDelegationIssuedByService,
    'found claimedDelegationIssuedByService'
  )

  // provider/add
  const providerAddAsAccountResult = await options.invoke(
    await Provider.add
      .invoke({
        issuer: deviceA,
        audience: service,
        with: accountA.did(),
        nb: {
          provider: 'did:web:web3.storage:providers:w3up-alpha',
          consumer: space.did(),
        },
        proofs: claimedDelegations,
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
  assert.deepEqual(
    spaceStorageResult.hasStorageProvider,
    true,
    `testing/space-storage.hasStorageProvider is true`
  )
}
