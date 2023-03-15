/* eslint-disable no-console */
import { context } from './helpers/context.js'
import { createTesterFromContext } from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import { Agent as AccessAgent } from '@web3-storage/access/agent'
import * as w3caps from '@web3-storage/capabilities'
import * as assert from 'assert'
import * as Ucanto from '@ucanto/interface'
import { createEmail } from './helpers/utils.js'
import { stringToDelegations } from '@web3-storage/access/encoding'
import * as delegationsResponse from '../src/utils/delegations-response.js'

for (const accessApiVariant of /** @type {const} */ ([
  {
    name: 'using access-api in miniflare',
    ...(() => {
      const account = {
        did: () => /** @type {const} */ ('did:mailto:dag.house:foo'),
      }
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
            account,
            registerSpaces: [spaceWithStorageProvider],
          }
        ),
      }
    })(),
  },
])) {
  describe(`access-client-agent ${accessApiVariant.name}`, () => {
    it('can createSpace', async () => {
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await accessApiVariant.connection,
      })
      const space = await accessAgent.createSpace('test-add')
      const delegations = accessAgent.proofs()
      assert.equal(space.proof.cid, delegations[0].cid)
    })
    it.skip('can authorize', async () => {
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await accessApiVariant.connection,
      })
      await accessAgent.authorize('example@dag.house')
    })

    it('can testSessionAuthorization', async () => {
      const { emails, connection, service } = accessApiVariant
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await connection,
      })
      /** @type {Ucanto.Principal<Ucanto.DID<'mailto'>>} */
      const account = { did: () => 'did:mailto:dag.house:example' }
      await testSessionAuthorization(
        await service,
        accessAgent,
        account,
        emails
      )
    })

    it('can requestAccess', async () => {
      const { connection } = accessApiVariant
      /** @type {Ucanto.Principal<Ucanto.DID<'mailto'>>} */
      const account = { did: () => 'did:mailto:dag.house:example' }
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await connection,
      })
      const authorization = await requestAuthorization(accessAgent, account, [
        { can: '*' },
      ])
      assert.ok(authorization)
    })
  })
}

/**
 * @typedef {import('./provider-add.test.js').AccessAuthorize} AccessAuthorize
 * @typedef {import('@web3-storage/capabilities/src/types.js').AccessConfirm} AccessConfirm
 * @typedef {import('./helpers/ucanto-test-utils.js').AccessService} AccessService
 */

/**
 * request authorization using access-api access/authorize
 *
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} authorizer - who you are requesting authorization from
 * @param {Iterable<{ can: Ucanto.Ability }>} abilities - e.g. [{ can: '*' }]
 */
async function requestAuthorization(access, authorizer, abilities) {
  const authorizeResult = await access.invokeAndExecute(
    w3caps.Access.authorize,
    {
      audience: access.connection.id,
      with: access.issuer.did(),
      nb: {
        iss: authorizer.did(),
        att: [...abilities],
      },
    }
  )
  assert.notDeepStrictEqual(
    authorizeResult.error,
    true,
    'authorize result is not an error'
  )
}

/**
 * @param {principal.ed25519.Signer.Signer<`did:web:${string}`, principal.ed25519.Signer.UCAN.SigAlg>} service
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {{to:string, url:string}[]} emails
 */
async function testSessionAuthorization(service, access, account, emails) {
  const authorizeResult = await access.invokeAndExecute(
    w3caps.Access.authorize,
    {
      audience: access.connection.id,
      with: access.issuer.did(),
      nb: {
        iss: account.did(),
        att: [{ can: '*' }],
      },
    }
  )
  assert.notDeepStrictEqual(
    authorizeResult.error,
    true,
    'authorize result is not an error'
  )

  const latestEmail = emails.at(-1)
  assert.ok(latestEmail, 'received a confirmation email')
  const confirmationInvocations = stringToDelegations(
    new URL(latestEmail.url).searchParams.get('ucan') ?? ''
  )
  assert.deepEqual(confirmationInvocations.length, 1)
  const serviceSaysAccountCanConfirm =
    /** @type {Ucanto.Invocation<import('@web3-storage/capabilities/src/types.js').AccessConfirm>} */ (
      confirmationInvocations[0]
    )

  const confirm = await w3caps.Access.confirm
    .invoke({
      nb: {
        ...serviceSaysAccountCanConfirm.capabilities[0].nb,
      },
      issuer: service,
      audience: access.connection.id,
      with: access.connection.id.did(),
      proofs: [serviceSaysAccountCanConfirm],
    })
    .delegate()

  const [confirmationResult] = await access.connection.execute(confirm)
  assert.notDeepStrictEqual(
    confirmationResult.error,
    true,
    'confirm result is not an error'
  )

  const claimResult = await access.invokeAndExecute(w3caps.Access.claim, {
    with: access.issuer.did(),
  })
  assert.notDeepEqual(
    claimResult.error,
    true,
    'access/claim result is not an error'
  )
  assert.ok(!claimResult.error)
  const claimedDelegations1 = [
    ...delegationsResponse.decode(claimResult.delegations),
  ]
  assert.ok(claimedDelegations1.length > 0, 'claimed some delegations')
}
