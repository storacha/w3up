import {
  assertNotError,
  registerSpaces,
  warnOnErrorResult,
} from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import * as assert from 'assert'
import * as ucanto from '@ucanto/core'
import * as Ucanto from '@ucanto/interface'
import { Access, Provider } from '@web3-storage/capabilities'
import * as delegationsResponse from '../src/utils/delegations-response.js'
import { NON_STANDARD } from '@ipld/dag-ucan/signature'
import {
  createContextWithMailbox,
  createAuthorization,
  Context,
} from './helpers/utils.js'

describe(`provider/add`, () => {
  it(`can invoke as did:mailto after authorize confirmation`, async () => {
    const { space, agent, account, ...context } = await setup()

    await registerSpaces([space], {
      ...context,
      account,
      agent,
    })

    await testAuthorizeClaimProviderAdd({
      deviceA: await principal.ed25519.generate(),
      accountA: account,
      space,
      conn: context.conn,
      service: context.service,
      emails: context.emails,
      mf: context.mf,
    })
  })

  it('provider/add allows for access/delegate', async () => {
    const { space, agent, account, service, ...context } = await setup()

    const accountAuthorizesAgentClaim = await ucanto.delegate({
      issuer: account,
      audience: agent,
      capabilities: [
        {
          with: 'ucan:*',
          can: '*',
        },
      ],
    })
    const serviceAttestsThatAccountAuthorizesAgent = await ucanto.delegate({
      issuer: service,
      audience: agent,
      capabilities: [
        {
          with: service.did(),
          can: 'ucan/attest',
          nb: { proof: accountAuthorizesAgentClaim.cid },
        },
      ],
    })
    const sessionProofs = [
      accountAuthorizesAgentClaim,
      serviceAttestsThatAccountAuthorizesAgent,
    ]
    const addStorageProviderResult = await ucanto
      .invoke({
        issuer: agent,
        audience: service,
        capability: {
          can: 'provider/add',
          with: account.did(),
          nb: {
            provider: service.did(),
            consumer: space.did(),
          },
        },
        proofs: [...sessionProofs],
      })
      .execute(context.conn)

    assertNotError(addStorageProviderResult)

    // storage provider added. So we should be able to delegate now
    const accessDelegateResult = await ucanto
      .invoke({
        issuer: agent,
        audience: service,
        capability: {
          can: 'access/delegate',
          with: space.did(),
          nb: {
            delegations: {},
          },
        },
        proofs: [
          // space says agent can access/delegate with space
          await ucanto.delegate({
            issuer: space,
            audience: agent,
            capabilities: [
              {
                can: 'access/delegate',
                with: space.did(),
              },
            ],
          }),
        ],
      })
      .execute(context.conn)
    assertNotError(accessDelegateResult)
  })

  it('provider/add allows for store/info ', async () => {
    const { space, agent, account, service, ...context } = await setup()

    const accountAuthorization = await createAccountAuthorization(
      agent,
      service,
      principal.Absentee.from({
        id: account.did(),
      })
    )
    const addStorageProviderResult = await ucanto
      .invoke({
        issuer: agent,
        audience: service,
        capability: {
          can: 'provider/add',
          with: account.did(),
          nb: {
            provider: service.did(),
            consumer: space.did(),
          },
        },
        proofs: [...accountAuthorization],
      })
      .execute(context.conn)

    assertNotError(addStorageProviderResult)

    // storage provider added. So we should be able to space/info now
    const spaceInfoResult = await ucanto
      .invoke({
        issuer: agent,
        audience: service,
        capability: {
          can: 'space/info',
          with: space.did(),
          nb: {
            delegations: {},
          },
        },
        proofs: [
          // space says agent can store/info with space
          await ucanto.delegate({
            issuer: space,
            audience: agent,
            capabilities: [
              {
                can: 'space/info',
                with: space.did(),
              },
            ],
          }),
        ],
      })
      .execute(context.conn)
    assertNotError(spaceInfoResult)
    assert.ok('did' in spaceInfoResult)
    assert.deepEqual(spaceInfoResult.did, space.did())
  })

  it('add providers set in env', async () => {
    const { space, agent, account, service, ...context } = await setup({
      env: {
        PROVIDERS: 'did:web:nft.storage,did:web:web3.storage',
      },
    })
    const proofs = await createAuthorization({ agent, service, account })
    const addNFTStorage = await Provider.add
      .invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:nft.storage',
          consumer: space.did(),
        },
        proofs,
      })
      .execute(context.conn)

    assertNotError(addNFTStorage)

    const w3space = await principal.ed25519.generate()
    const addW3Storage = await Provider.add
      .invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:web3.storage',
          consumer: w3space.did(),
        },
        proofs,
      })
      .execute(context.conn)

    assertNotError(addW3Storage)
  })

  it('provider/add can not add two diff providers to the same space', async () => {
    const { space, agent, account, service, ...context } = await setup({
      env: {
        PROVIDERS: 'did:web:nft.storage,did:web:web3.storage',
      },
    })

    const proofs = await createAuthorization({ agent, service, account })
    const addNFTStorage = await Provider.add
      .invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:nft.storage',
          consumer: space.did(),
        },
        proofs,
      })
      .execute(context.conn)

    assertNotError(addNFTStorage)

    const addW3Storage = await Provider.add
      .invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:web3.storage',
          consumer: space.did(),
        },
        proofs,
      })
      .execute(context.conn)

    assert.equal(
      addW3Storage.error,
      true,
      'Provider already added to this space'
    )

    assert.match(
      addW3Storage.error ? addW3Storage?.message : '',
      /it already has a did:web:nft.storage provider/
    )
  })
})

/**
 * Sets up test context and creates various principals used in this test suite.
 *
 * @param {Context.Options} options
 */
const setup = async (options = {}) => {
  const context = await createContextWithMailbox(options)
  const space = await principal.ed25519.generate()
  const agent = await principal.ed25519.generate()
  const account = principal.Absentee.from({ id: 'did:mailto:example.com:foo' })

  return { ...context, space, agent, account }
}

/**
 * @typedef {import('../src/utils/email.js').ValidationEmailSend} ValidationEmailSend
 */

/**
 * @param {object} options
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.deviceA
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} options.accountA
 * @param {Ucanto.Principal<Ucanto.DID<'web'>>} options.service - web3.storage service
 * @param {import('miniflare').Miniflare} options.mf
 * @param {import('@ucanto/interface').ConnectionView<import('@web3-storage/access/types').Service>} options.conn
 * @param {ValidationEmailSend[]} options.emails
 */
async function testAuthorizeClaimProviderAdd(options) {
  const { accountA, conn, deviceA, mf, service, space, emails } = options
  // authorize

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
    .execute(conn)

  const validationEmail = emails.at(-1)
  assert.ok(validationEmail, 'has email after authorize')

  const confirmationUrl = validationEmail.url
  assert.ok(typeof confirmationUrl === 'string', 'confirmationUrl is string')
  const confirmEmailPostResponse = await mf.dispatchFetch(
    new URL(confirmationUrl),
    { method: 'POST' }
  )
  assert.deepEqual(
    confirmEmailPostResponse.status,
    200,
    'confirmEmailPostResponse status is 200'
  )

  // claim as deviceA
  const claimAsDeviceAResult = await Access.claim
    .invoke({
      issuer: deviceA,
      audience: service,
      with: deviceA.did(),
    })
    .execute(conn)

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
  const providerAddAsAccountResult = await Provider.add
    .invoke({
      issuer: deviceA,
      audience: service,
      with: accountA.did(),
      nb: {
        provider: service.did(),
        consumer: space.did(),
      },
      proofs: claimedDelegations,
    })
    .execute(conn)

  assert.ok(
    providerAddAsAccountResult &&
      typeof providerAddAsAccountResult === 'object',
    `providerAddAsAccountResult is an object`
  )
  assertNotError(providerAddAsAccountResult)

  const spaceStorageResult = await ucanto
    .invoke({
      issuer: space,
      audience: service,
      capability: {
        can: 'testing/space-storage',
        with: space.did(),
      },
    })
    // @ts-ignore - not in service type because only enabled while testing
    .execute(conn)

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

/**
 * Create some proofs that delegate capabilities to agent to invoke on behalf of account.
 * This is supposed to emulate what gets created by `access/authorize` confirmation email link click.
 *
 * @param {Ucanto.Principal<Ucanto.DID<'key'>>} agent - device agent that will be authorized
 * @param {Ucanto.Signer<Ucanto.DID>} service
 * @param {Ucanto.UCAN.Signer<Ucanto.DID<'mailto'>, NON_STANDARD>} account
 * @param {Ucanto.Capabilities} capabilities
 * @returns
 */
async function createAccountAuthorization(
  agent,
  service,
  account,
  capabilities = [
    {
      with: 'ucan:*',
      can: '*',
    },
  ]
) {
  const accountAuthorizesAgentClaim = await ucanto.delegate({
    issuer: account,
    audience: agent,
    capabilities,
  })
  const serviceAttestsThatAccountAuthorizesAgent = await ucanto.delegate({
    issuer: service,
    audience: agent,
    capabilities: [
      {
        with: service.did(),
        can: 'ucan/attest',
        nb: { proof: accountAuthorizesAgentClaim.cid },
      },
    ],
  })
  const proofs = [
    accountAuthorizesAgentClaim,
    serviceAttestsThatAccountAuthorizesAgent,
  ]
  return proofs
}
