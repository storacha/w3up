/* eslint-disable no-console */
import { context } from './helpers/context.js'
import { createTesterFromContext } from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import { Agent as AccessAgent } from '@web3-storage/access/agent'
import * as w3caps from '@web3-storage/capabilities'
import * as assert from 'assert'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { createEmail } from './helpers/utils.js'
import { stringToDelegations } from '@web3-storage/access/encoding'

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

    it('can be used to do session authorization', async () => {
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
  })
}

/**
 * @typedef {import('./provider-add.test.js').AccessAuthorize} AccessAuthorize
 * @typedef {import('@web3-storage/capabilities/src/types.js').AccessConfirm} AccessConfirm
 * @typedef {import('./helpers/ucanto-test-utils.js').AccessService} AccessService
 */

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

  // eslint-disable-next-line no-console
  console.log({ authorizeResult, emails })

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
  console.log(
    'serviceSaysAccountCanConfirm',
    JSON.stringify(serviceSaysAccountCanConfirm, undefined, 2)
  )

  const confirm = await w3caps.Access.confirm
    .invoke({
      nb: {
        ...serviceSaysAccountCanConfirm.capabilities[0].nb,
      },
      issuer: access.issuer,
      audience: access.connection.id,
      with: access.connection.id.did(),
      proofs: [
        serviceSaysAccountCanConfirm,
        ...(await createSessionProofs(service, account, access.issuer, [
          { can: '*', with: service.did() },
        ])),
      ],
    })
    .delegate()
  console.log('confirm', JSON.stringify(confirm, undefined, 2))

  const [confirmationResult] = await access.connection.execute(confirm)
  console.log({ confirmationResult })
  assert.notDeepStrictEqual(
    confirmationResult.error,
    true,
    'confirm result is not an error'
  )
}

/**
 * @param {principal.ed25519.Signer.Signer<`did:web:${string}`, principal.ed25519.Signer.UCAN.SigAlg>} service
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} agent
 * @param {Ucanto.Capabilities} capabilities
 * @param {number} expiration
 * @returns {Promise<Array<Ucanto.Delegation>>}
 */
async function createSessionProofs(
  service,
  account,
  agent,
  capabilities,
  expiration = Infinity
) {
  const delegation = await ucanto.delegate({
    issuer: principal.Absentee.from({ id: account.did() }),
    audience: agent,
    capabilities,
    expiration,
  })

  const attestation = await w3caps.Access.session.delegate({
    issuer: service,
    audience: agent,
    with: service.did(),
    nb: { proof: delegation.cid },
    expiration,
  })

  return [delegation, attestation]
}
