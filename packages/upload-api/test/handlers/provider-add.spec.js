import * as principal from '@ucanto/principal'
import * as assert from 'assert'
import * as ucanto from '@ucanto/core'
import * as API from '../../src/types.js'
import * as Types from '../types.js'
import { cleanupContext, createContext } from '../helpers/context.js'
import { Access, Provider, Consumer } from '@web3-storage/capabilities'
import * as delegationsResponse from '../../src/utils/delegations-response.js'
import { NON_STANDARD } from '@ipld/dag-ucan/signature'
import { createAuthorization } from '../helpers/utils.js'
import { authorizeFromUrl } from '../../src/validate.js'

describe(`provider/add`, () => {
  it(`can invoke as did:mailto after authorize confirmation`, async () => {
    const { space, agent, account, ...context } = await setup()
    try {
      await testAuthorizeClaimProviderAdd({
        deviceA: await principal.ed25519.generate(),
        accountA: account,
        space,
        conn: context.connection,
        service: context.service,
        emails: context.mail,
        context,
      })
    } finally {
      await cleanupContext(context)
    }
  })

  it('provider/add allows for access/delegate', async () => {
    const { space, agent, account, ...context } = await setup()
    const { service } = context
    try {
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
        .execute(context.connection)

      assert.equal(addStorageProviderResult.out.error, undefined)

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
        .execute(context.connection)

      assert.equal(accessDelegateResult.out.error, undefined)
    } finally {
      await cleanupContext(context)
    }
  })

  it('provider/add allows for store/info ', async () => {
    const { space, agent, account, ...context } = await setup()
    const { service } = context

    try {
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
        .execute(context.connection)

      assert.equal(addStorageProviderResult.out.error, undefined)

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
        .execute(context.connection)
      assert.ok(spaceInfoResult.out.ok)
      assert.ok('did' in spaceInfoResult.out.ok)
      assert.deepEqual(spaceInfoResult.out.ok.did, space.did())
    } finally {
      await cleanupContext(context)
    }
  })

  it('add providers set in env', async () => {
    const { space, agent, account, ...context } = await setup({
      providers: ['did:web:nft.storage', 'did:web:web3.storage'],
    })
    const { service } = context
    try {
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
        .execute(context.connection)

      assert.equal(addNFTStorage.out.error, undefined)

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
        .execute(context.connection)

      assert.equal(addW3Storage.out.error, undefined)
    } finally {
      await cleanupContext(context)
    }
  })

  it('provider/add can not add two diff providers to the same space', async () => {
    const { space, agent, account, ...context } = await setup({
      providers: ['did:web:nft.storage', 'did:web:web3.storage'],
    })
    const { service } = context

    try {
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
        .execute(context.connection)

      assert.equal(addNFTStorage.out.error, undefined)

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
        .execute(context.connection)

      assert.ok(addW3Storage.out.error, 'Provider already added to this space')
    } finally {
      await cleanupContext(context)
    }
  })

  it('provider/add fails if plans are required and a plan has not been configured', async () => {
    const { space, agent, account, ...context } = await setup({
      requirePaymentPlan: true,
    })
    const { service } = context

    try {
      const proofs = await createAuthorization({ agent, service, account })

      const addResult = await Provider.add
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
        .execute(context.connection)

      assert.ok(
        addResult.out.error,
        'Expected error provisioning without adding a plan'
      )
      assert.equal(
        addResult.out.error.message,
        `Account identified by ${account.did()} has not selected a payment plan`
      )
    } finally {
      await cleanupContext(context)
    }
  })
})

/**
 * Sets up test context and creates various principals used in this test suite.
 *
 * @param {any} options
 * @returns {Promise<Types.ProviderTestContext>}
 */
const setup = async (options = {}) => {
  const context = await createContext(options)
  const space = await principal.ed25519.generate()
  const agent = await principal.ed25519.generate()
  const account = principal.Absentee.from({ id: 'did:mailto:example.com:foo' })

  return { ...context, space, agent, account }
}

/**
 * @typedef {import('../../src/utils/email.js').ValidationEmailSend} ValidationEmailSend
 */

/**
 * @param {object} options
 * @param {API.Signer<API.DID<'key'>>} options.deviceA
 * @param {API.Signer<API.SpaceDID>} options.space
 * @param {API.Principal<API.DID<'mailto'>>} options.accountA
 * @param {API.Signer<API.DID<'web'>>} options.service - web3.storage service
 * @param {API.ConnectionView<API.Service>} options.conn
 * @param {API.AccessServiceContext} options.context
 * @param {API.DebugEmail} options.emails
 */
async function testAuthorizeClaimProviderAdd(options) {
  const { accountA, conn, deviceA, service, space, emails, context } = options
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

  const validationEmail = await emails.take()

  assert.ok(validationEmail, 'has email after authorize')

  const confirmationUrl = validationEmail.url
  assert.ok(typeof confirmationUrl === 'string', 'confirmationUrl is string')
  const confirmEmailPostResponse = await authorizeFromUrl(
    confirmationUrl,
    context
  )
  assert.ok(confirmEmailPostResponse.ok)

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
  assert.ok(claimAsDeviceAResult.out.ok)
  assert.ok(
    'delegations' in claimAsDeviceAResult.out.ok &&
      typeof claimAsDeviceAResult.out.ok.delegations === 'object' &&
      claimAsDeviceAResult.out.ok.delegations,
    'claimAsDeviceAResult should have delegations property'
  )
  const claimedDelegations = [
    ...delegationsResponse.decode(
      /** @type {Record<string,API.ByteView<API.Delegation>>} */ (
        claimAsDeviceAResult.out.ok.delegations
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
  assert.equal(providerAddAsAccountResult.out.error, undefined)

  const spaceStorageResult = await Consumer.has
    .invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
    })
    .execute(conn)

  assert.deepEqual(
    spaceStorageResult.out,
    { ok: true },
    `consumer/has reports true`
  )
}

/**
 * Create some proofs that delegate capabilities to agent to invoke on behalf of account.
 * This is supposed to emulate what gets created by `access/authorize` confirmation email link click.
 *
 * @param {API.Principal<API.DID<'key'>>} agent - device agent that will be authorized
 * @param {API.Signer<API.DID>} service
 * @param {API.UCAN.Signer<API.DID<'mailto'>, NON_STANDARD>} account
 * @param {API.Capabilities} capabilities
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
