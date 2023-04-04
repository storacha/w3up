/* eslint-disable unicorn/consistent-function-scoping */
import { context } from './helpers/context.js'
import {
  assertNotError,
  createTesterFromContext,
} from './helpers/ucanto-test-utils.js'
import * as DidMailto from '@web3-storage/did-mailto'
import * as principal from '@ucanto/principal'
import {
  addProvider,
  addSpacesFromDelegations,
  Agent as AccessAgent,
  authorizeAndWait,
  claimAccess,
  delegationsIncludeSessionProof,
  pollAccessClaimUntil,
  requestAccess,
  waitForAuthorizationByPolling,
} from '@web3-storage/access/agent'
import * as w3caps from '@web3-storage/capabilities'
import * as assert from 'assert'
import * as Ucanto from '@ucanto/interface'
import { createEmail } from './helpers/utils.js'
import {
  stringToDelegation,
  stringToDelegations,
} from '@web3-storage/access/encoding'
import * as delegationsResponse from '../src/utils/delegations-response.js'
import { AgentData } from '@web3-storage/access'

for (const accessApiVariant of /** @type {const} */ ([
  {
    name: 'using access-api in miniflare',
    ...(() => {
      const account = {
        did: () => /** @type {const} */ ('did:mailto:dag.house:foo'),
      }
      const spaceWithStorageProvider = principal.ed25519.generate()
      async function createContext() {
        /** @type {{url:string,to:string}[]} */
        const emails = []
        const email = createEmail(emails)
        const ctx = await context({
          globals: {
            email,
          },
        })
        return {
          ...ctx,
          emails,
          connection: ctx.conn,
        }
      }
      return {
        spaceWithStorageProvider,
        ...createTesterFromContext(createContext, {
          account,
          registerSpaces: [spaceWithStorageProvider],
        }),
      }
    })(),
  },
])) {
  describe(`access-client-agent ${accessApiVariant.name}`, () => {
    it('can createSpace', async () => {
      const { connection } = await accessApiVariant.create()
      const accessAgent = await AccessAgent.create(undefined, {
        connection,
      })
      const space = await accessAgent.createSpace('test-add')
      const delegations = accessAgent.proofs()
      assert.equal(space.proof.cid, delegations[0].cid)
    })
    it('can requestAuthorization', async () => {
      const { connection, emails } = await accessApiVariant.create()
      const accessAgent = await AccessAgent.create(undefined, {
        connection,
      })
      const emailCount = emails.length
      const abort = new AbortController()
      after(() => abort.abort())
      const account = {
        did: () => DidMailto.fromEmail(DidMailto.email('example@dag.house')),
      }
      await requestAccess(accessAgent, account, [{ can: '*' }])
      assert.deepEqual(emails.length, emailCount + 1)
    })

    it('can testSessionAuthorization', async () => {
      const { connection, service, emails } = await accessApiVariant.create()
      const accessAgent = await AccessAgent.create(undefined, {
        connection,
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

    it('can requestAuthorization', async () => {
      const { connection } = await accessApiVariant.create()
      /** @type {Ucanto.Principal<Ucanto.DID<'mailto'>>} */
      const account = { did: () => 'did:mailto:dag.house:example' }
      const accessAgent = await AccessAgent.create(undefined, { connection })
      await requestAccess(accessAgent, account, [{ can: '*' }])
    })

    it('can authorize session with account and use', async () => {
      const { emails, connection } = await accessApiVariant.create()
      /** @type {Ucanto.Principal<Ucanto.DID<'mailto'>>} */
      const account = { did: () => 'did:mailto:dag.house:example' }
      const accessAgent = await AccessAgent.create(undefined, {
        connection,
      })

      // request that account authorizes accessAgent
      // this should result in sending a confirmation email
      const requestAllAbilities = requestAccess(accessAgent, account, [
        { can: '*' },
      ])

      // in parallel:
      // * request authorization
      // * keep checking your email for the confirmation email that sends, then return it
      // await both succeeding
      const abort = new AbortController()
      after(() => abort.abort())
      const [, confirmEmail] = await Promise.all([
        requestAllAbilities,
        watchForEmail(emails, 100, abort.signal).then((email) => {
          return email
        }),
      ])

      // extract confirmation invocation from email that was sent by service while handling access/authorize
      const confirm = await extractConfirmInvocation(new URL(confirmEmail.url))
      // invoke the access/confirm invocation as if the user had clicked the email
      const [confirmResult] = await connection.execute(confirm)
      assert.notEqual(
        confirmResult.error,
        true,
        'access/confirm result is not an error'
      )

      // these are delegations with audience=accessAgent.issuer
      const claimedAsAgent = await claimAccess(
        accessAgent,
        accessAgent.issuer.did(),
        { addProofs: true }
      )
      assert.deepEqual(claimedAsAgent.length, 2)
      assert.ok(
        claimedAsAgent.every(
          (d) => d.audience.did() === accessAgent.issuer.did()
        )
      )

      // we expect these to have sessionProofs
      // one ucan/attest and one that is attested to
      const delegationFromAccountToSession = claimedAsAgent.find(
        (d) => d.issuer.did() === account.did()
      )
      assert.ok(
        delegationFromAccountToSession,
        'claimed delegationFromAccountToSession'
      )
      const attestation = claimedAsAgent.find(
        (d) => d.capabilities[0].can === 'ucan/attest'
      )
      assert.ok(attestation, 'claimed attestation')
      assert.equal(
        /** @type {any} */ (attestation).capabilities[0].nb.proof.toString(),
        delegationFromAccountToSession.cid.toString(),
        'ucan/attest proof cid matches delegation cid'
      )

      const accountProofs = [delegationFromAccountToSession, attestation]
      assert.ok(accountProofs)
    })

    it('can registerSpace', async () => {
      const { connection, emails } = await accessApiVariant.create()
      const accountEmail = DidMailto.email('foo@dag.house')
      const account = { did: () => DidMailto.fromEmail(accountEmail) }
      const accessAgent = await AccessAgent.create(undefined, {
        connection,
      })
      const abort = new AbortController()
      after(() => abort.abort())

      // request agent authorization from account
      requestAccess(accessAgent, account, [{ can: '*' }])
      // confirm authorization
      const confirmationEmail = await watchForEmail(emails, 100, abort.signal)
      await confirmConfirmationUrl(accessAgent.connection, confirmationEmail)
      // claim delegations after confirmation
      await claimAccess(accessAgent, accessAgent.issuer.did(), {
        addProofs: true,
      })

      // create space
      const spaceName = `space-test-${Math.random().toString().slice(2)}`
      const spaceCreation = await accessAgent.createSpace(spaceName)
      await accessAgent.setCurrentSpace(spaceCreation.did)

      // 'register space' - i.e. add a storage provider as an account
      await accessAgent.registerSpace(accountEmail, {
        provider: /** @type {Ucanto.DID<'web'>} */ (connection.id.did()),
      })
    })

    it('same agent, multiple accounts, provider/add', async () => {
      const accounts = /** @type {const} */ ([
        'test-a@dag.house',
        'test-b@dag.house',
      ]).map((email) => ({
        email,
        did: thisEmailDidMailto,
      }))
      const { connection, emails } = await accessApiVariant.create()
      const accessAgentData = await AgentData.create()
      const accessAgent = await AccessAgent.create(accessAgentData, {
        connection,
      })
      const abort = new AbortController()
      after(() => abort.abort())
      /** @param {AgentData} agentData */
      const countDelegations = ({ delegations }) =>
        [...delegations.values()].length
      assert.deepEqual(
        countDelegations(accessAgentData),
        0,
        'agentData has zero delegations initially'
      )
      let expectedDataDelegations = 0
      for (const account of accounts) {
        // request agent authorization from account
        await requestAccess(accessAgent, account, [{ can: '*' }])
        // confirm authorization
        const confirmationEmail = await watchForEmail(emails, 100, abort.signal)
        await confirmConfirmationUrl(accessAgent.connection, confirmationEmail)
        // claim delegations after confirmation
        await claimAccess(accessAgent, accessAgent.issuer.did(), {
          addProofs: true,
        })
        // expect two new delegations, [delegationFromAccount, attestationFromService]
        expectedDataDelegations += 2
        assert.deepEqual(
          countDelegations(accessAgentData),
          expectedDataDelegations,
          `agentData has ${expectedDataDelegations} after authorizing account ${account.did()} and claiming`
        )
      }

      // create space
      const spaceName = `space-test-${Math.random().toString().slice(2)}`
      const spaceCreation = await accessAgent.createSpace(spaceName)
      // expect 1 new delegation from space.did() -> accessAgent.issuer.did()
      expectedDataDelegations += 1
      assert.deepEqual(
        countDelegations(accessAgentData),
        expectedDataDelegations,
        `agentData has ${expectedDataDelegations} after calling accessClientAgent.createSpace(...)`
      )

      await accessAgent.setCurrentSpace(spaceCreation.did)

      const provider = /** @type {Ucanto.DID<'web'>} */ (
        accessAgent.connection.id.did()
      )
      for (const account of accounts) {
        await addProvider({
          access: accessAgent,
          space: spaceCreation.did,
          account,
          provider,
        })
      }
    })

    it('can use second device with same account', async () => {
      const account = {
        email: 'example@dag.house',
        did: thisEmailDidMailto,
      }
      const { connection, emails } = await accessApiVariant.create()
      const provider = /** @type {Ucanto.DID<'web'>} */ (connection.id.did())
      const abort = new AbortController()
      after(() => abort.abort())

      // first device
      const deviceAAgentData = await AgentData.create()
      const deviceA = await AccessAgent.create(deviceAAgentData, {
        connection,
      })

      // deviceA authorization
      await requestAccess(deviceA, account, [{ can: '*' }])
      await confirmConfirmationUrl(
        deviceA.connection,
        await watchForEmail(emails, 100, abort.signal)
      )
      await claimAccess(deviceA, deviceA.issuer.did(), {
        addProofs: true,
      })

      // deviceA creates a space
      const spaceCreation = await deviceA.createSpace(
        `space-test-${Math.random().toString().slice(2)}`
      )
      assert.ok(spaceCreation.did)
      // deviceA registers a space
      await deviceA.registerSpace(account.email, {
        provider,
        space: spaceCreation.did,
      })

      /**
       * second device - deviceB
       */
      const deviceBData = await AgentData.create()
      const deviceB = await AccessAgent.create(deviceBData, {
        connection,
      })
      // authorize deviceB
      await requestAccess(deviceB, account, [{ can: '*' }])
      await confirmConfirmationUrl(
        deviceB.connection,
        await watchForEmail(emails, 100, abort.signal)
      )
      // claim delegations aud=deviceB.issuer
      const deviceBIssuerClaimed = await claimAccess(
        deviceB,
        deviceB.issuer.did(),
        {
          addProofs: true,
        }
      )
      assert.equal(
        deviceBIssuerClaimed.length,
        2,
        'deviceBIssuerClaimed delegations'
      )

      // try to addProvider
      await addProvider({
        access: deviceB,
        space: spaceCreation.did,
        account,
        provider,
      })

      // issuer + account proofs should authorize deviceB to invoke space/info
      const spaceInfoResult = await deviceB.invokeAndExecute(
        w3caps.Space.info,
        {
          with: spaceCreation.did,
        }
      )
      assertNotError(spaceInfoResult)
      assert.notEqual(
        spaceInfoResult.error,
        true,
        'spaceInfoResult is not an error'
      )
      assert.ok(!spaceInfoResult.error)
      assert.deepEqual(spaceInfoResult.did, spaceCreation.did)
    })
  })

  it('can addSpacesFromDelegations', async () => {
    const { connection } = await accessApiVariant.create()
    const accessAgent = await AccessAgent.create(undefined, {
      connection,
    })
    await addSpacesFromDelegations(accessAgent, [])
  })

  it('authorizeAndWait', async () => {
    const abort = new AbortController()
    after(() => abort.abort())
    const account = {
      email: /** @type {const} */ ('example+123@dag.house'),
      did: thisEmailDidMailto,
    }
    const { connection, emails } = await accessApiVariant.create()
    const provider = /** @type {Ucanto.DID<'web'>} */ (connection.id.did())
    const deviceA = await AccessAgent.create(undefined, {
      connection,
    })
    const authorize = () =>
      authorizeAndWait(deviceA, account.email, {
        signal: abort.signal,
        expectAuthorization: waitForAuthorizationByPolling,
      })
    const clickNextConfirmationLink = () =>
      watchForEmail(emails, 100, abort.signal).then((email) => {
        return confirmConfirmationUrl(deviceA.connection, email)
      })
    await Promise.all([authorize(), clickNextConfirmationLink()])

    const space = await deviceA.createSpace()
    await addProvider({ access: deviceA, space: space.did, account, provider })
    const spaceInfoResult = await deviceA.invokeAndExecute(w3caps.Space.info, {
      with: space.did,
    })
    assertNotError(spaceInfoResult)

    const latestEmail = emails.at(-1)
    assert.deepEqual(latestEmail?.to, account.email, 'emails are equal')
  })

  it('authorizeWithPollClaim', async () => {
    const abort = new AbortController()
    after(() => abort.abort())
    const account = {
      email: /** @type {const} */ ('example@dag.house'),
      did: thisEmailDidMailto,
    }
    const { connection, emails } = await accessApiVariant.create()
    const provider = /** @type {Ucanto.DID<'web'>} */ (connection.id.did())
    const deviceA = await AccessAgent.create(undefined, {
      connection,
    })
    const authorize = () =>
      authorizeWithPollClaim(deviceA, account.email, { signal: abort.signal })
    const clickNextConfirmationLink = () =>
      watchForEmail(emails, 100, abort.signal).then((email) => {
        return confirmConfirmationUrl(deviceA.connection, email)
      })
    await Promise.all([authorize(), clickNextConfirmationLink()])

    const space = await deviceA.createSpace()
    await addProvider({ access: deviceA, space: space.did, account, provider })
    const spaceInfoResult = await deviceA.invokeAndExecute(w3caps.Space.info, {
      with: space.did,
    })
    assertNotError(spaceInfoResult)
  })

  it('can poll access/claim to know when confirmation happened', async () => {
    const abort = new AbortController()
    after(() => abort.abort())
    const account = {
      email: /** @type {const} */ ('example@dag.house'),
      did: thisEmailDidMailto,
    }
    const { connection, emails } = await accessApiVariant.create()
    const deviceA = await AccessAgent.create(undefined, {
      connection,
    })

    const authorize = async () => {
      // fire off request
      await requestAccess(deviceA, account, [{ can: '*' }])
      const claimed = await pollAccessClaimUntil(
        delegationsIncludeSessionProof,
        deviceA,
        deviceA.issuer.did(),
        { signal: abort.signal }
      )
      return claimed
    }
    const clickNextConfirmationLink = () =>
      watchForEmail(emails, 100, abort.signal).then((email) => {
        return confirmConfirmationUrl(deviceA.connection, email)
      })
    const [claimed] = await Promise.all([
      authorize(),
      clickNextConfirmationLink(),
    ])
    assert.equal([...claimed].length, 2)
  })
}

/**
 *
 * @param {Ucanto.ConnectionView<AccessService>} connection
 * @param {{ url: string|URL }} confirmation
 */
async function confirmConfirmationUrl(connection, confirmation) {
  // extract confirmation invocation from email that was sent by service while handling access/authorize
  const confirm = await extractConfirmInvocation(new URL(confirmation.url))
  // invoke the access/confirm invocation as if the user had clicked the email
  const [confirmResult] = await connection.execute(confirm)
  assert.notEqual(
    confirmResult.error,
    true,
    'access/confirm result is not an error'
  )
}

/**
 * @param {URL} confirmationUrl
 * @returns {Promise<Ucanto.Invocation<AccessConfirm>>}
 */
async function extractConfirmInvocation(confirmationUrl) {
  const delegation = stringToDelegation(
    confirmationUrl.searchParams.get('ucan') ?? ''
  )
  if (
    delegation.capabilities.length !== 1 ||
    delegation.capabilities[0].can !== 'access/confirm'
  ) {
    throw new Error(`parsed unexpected delegation from confirmationUrl`)
  }
  const confirm = /** @type {Ucanto.Invocation<AccessConfirm>} */ (delegation)
  return confirm
}

/**
 * @param {Array<{ url: string }>} emails
 * @param {number} retryAfter
 * @param {AbortSignal} [abort]
 * @returns {Promise<{ url: string }>} latest email, once received
 */
function watchForEmail(emails, retryAfter, abort) {
  return new Promise((resolve, reject) => {
    if (abort) {
      abort.addEventListener('abort', () => reject(new Error('aborted')))
    }
    const latestEmail = emails.at(-1)
    if (latestEmail) {
      return resolve(latestEmail)
    }
    if (typeof retryAfter === 'number') {
      setTimeout(
        () => watchForEmail(emails, retryAfter).then(resolve).catch(reject),
        retryAfter
      )
    }
  })
}

/**
 * @typedef {import('@web3-storage/capabilities/src/types.js').AccessConfirm} AccessConfirm
 * @typedef {import('./helpers/ucanto-test-utils.js').AccessService} AccessService
 */

/**
 * @param {principal.ed25519.Signer.Signer<`did:web:${string}`, principal.ed25519.Signer.UCAN.SigAlg>} service
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {{url:string}[]} emails
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

/**
 * @this {{email: string}}
 * @returns {Ucanto.DID<'mailto'>}
 */
function thisEmailDidMailto() {
  return DidMailto.fromEmail(DidMailto.email(this.email))
}

/**
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} access
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {Iterable<{ can: Ucanto.Ability }>} [opts.capabilities]
 */
export async function authorizeWithPollClaim(access, email, opts) {
  await authorizeAndWait(access, email, {
    ...opts,
    expectAuthorization: waitForAuthorizationByPolling,
  })
}
