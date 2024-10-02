import * as API from './types.js'
import { Absentee } from '@ucanto/principal'
import * as delegationsResponse from '../src/utils/delegations-response.js'
import * as DidMailto from '@web3-storage/did-mailto'
import { Access, Space, Top } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access'
import { alice } from './helpers/utils.js'
import { stringToDelegations } from '@web3-storage/access/encoding'
import {
  confirmConfirmationUrl,
  extractConfirmInvocation,
} from './helpers/utils.js'
import {
  Agent,
  Access as AgentAccess,
  claimAccess,
  addProvider,
  authorizeAndWait,
  pollAccessClaimUntil,
  waitForAuthorizationByPolling,
  delegationsIncludeSessionProof,
  addSpacesFromDelegations,
  requestAccess,
} from '@web3-storage/access/agent'
import * as Provider from '@web3-storage/access/provider'

/**
 * Create and return a space, delegated to the device agent and to the account,
 * and provisioned for the account.
 *
 * @param {Agent} device
 * @param {API.Principal<import('@ucanto/interface').DID<"mailto">>} account
 * @param {API.Assert} assert
 */
const createSpace = async (device, account, assert) => {
  const space = await device.createSpace(
    `space-test-${Math.random().toString().slice(2)}`
  )

  assert.ok(space.did())
  // provision space with an account so it can store delegations
  const provisionResult = await Provider.add(device, {
    account: account.did(),
    consumer: space.did(),
  })
  assert.ok(provisionResult.ok)

  // authorize device
  const auth = await space.createAuthorization(device, {
    access: AgentAccess.spaceAccess,
    expiration: Infinity,
  })
  await device.importSpaceFromDelegation(auth)

  // make space current
  await device.setCurrentSpace(space.did())

  const recovery = await space.createRecovery(account.did())
  const delegateResult = await AgentAccess.delegate(device, {
    delegations: [recovery],
  })
  assert.ok(delegateResult.ok)
  return space
}

/**
 * Claim (`access/claim`) delegations for the device agent, and add them to the
 * agent's proofs.
 *
 * @param {Agent} device
 */
const claimDelegations = async (device) => {
  await claimAccess(device, device.issuer.did(), {
    addProofs: true,
    nonce: Math.random().toString(),
  })
}

/**
 * Assert that the device agent can invoke `space/info` on the given space.
 *
 * @param {Agent} device
 * @param {import('@web3-storage/access/agent').OwnedSpace} space
 * @param {API.Assert} assert
 */
async function assertCanSpaceInfo(device, space, assert) {
  const spaceInfoResult = await device.invokeAndExecute(Space.info, {
    with: space.did(),
  })

  assert.equal(spaceInfoResult.out.error, undefined)

  assert.ok(spaceInfoResult.out.ok)
  const result =
    /** @type {import('@web3-storage/access/types').SpaceInfoResult} */ (
      spaceInfoResult.out.ok
    )
  assert.deepEqual(result.did, space.did())
}

/**
 * @type {API.Tests}
 */
export const test = {
  'can createSpace': async (assert, context) => {
    const { agent } = await setup(context)

    const space = await agent.createSpace('test-add')
    const auth = await space.createAuthorization(agent, {
      access: AgentAccess.spaceAccess,
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)
    const [proof] = agent.proofs()
    assert.deepEqual(auth.cid, /** @type {API.Link} */ (proof.cid))
  },
  'can requestAuthorization': async (assert, context) => {
    const { agent, mail, account, accountEmail } = await setup(context)

    await requestAccess(agent, account, [{ can: '*' }])
    const message = await mail.take()
    assert.deepEqual(message.to, accountEmail)
  },
  'can testSessionAuthorization': async (assert, context) => {
    const { agent, account, mail, service } = await setup(context)

    const authorizeResult = await agent.invokeAndExecute(Access.authorize, {
      audience: agent.connection.id,
      with: agent.issuer.did(),
      nb: {
        iss: account.did(),
        att: [{ can: '*' }],
      },
    })
    assert.equal(
      authorizeResult.out.error,
      undefined,
      'authorize result is not an error'
    )

    const latestEmail = await mail.take()
    assert.ok(latestEmail, 'received a confirmation email')

    const confirmationInvocations = stringToDelegations(
      new URL(latestEmail.url).searchParams.get('ucan') ?? ''
    )
    assert.deepEqual(confirmationInvocations.length, 1)
    const serviceSaysAccountCanConfirm =
      /** @type {API.Invocation<import('@web3-storage/capabilities/types').AccessConfirm>} */ (
        confirmationInvocations[0]
      )

    const confirm = await Access.confirm
      .invoke({
        nb: {
          ...serviceSaysAccountCanConfirm.capabilities[0].nb,
        },
        issuer: service,
        audience: agent.connection.id,
        with: agent.connection.id.did(),
        proofs: [serviceSaysAccountCanConfirm],
      })
      .delegate()

    const [confirmationResult] = await agent.connection.execute(confirm)
    assert.equal(
      confirmationResult.out.error,
      undefined,
      'confirm result is not an error'
    )

    const claimResult = await agent.invokeAndExecute(Access.claim, {
      with: agent.issuer.did(),
    })

    assert.equal(
      claimResult.out.error,
      undefined,
      'access/claim result is not an error'
    )

    assert.ok(claimResult.out.ok)
    const claimedDelegations1 = [
      ...delegationsResponse.decode(claimResult.out.ok?.delegations || {}),
    ]
    assert.ok(claimedDelegations1.length > 0, 'claimed some delegations')
  },
  'can authorize session with account and use it': async (assert, context) => {
    const { agent, account, mail } = await setup(context)

    // request that account authorizes accessAgent
    // this should result in sending a confirmation email
    await requestAccess(agent, account, [{ can: '*' }])

    const confirmEmail = await mail.take()

    // extract confirmation invocation from email that was sent by service while handling access/authorize
    const confirm = await extractConfirmInvocation(new URL(confirmEmail.url))
    // invoke the access/confirm invocation as if the user had clicked the email
    const [confirmResult] = await agent.connection.execute(confirm)
    assert.equal(
      confirmResult.out.error,
      undefined,
      'access/confirm result is not an error'
    )

    // these are delegations with audience=accessAgent.issuer
    const claimedAsAgent = await claimAccess(agent, agent.issuer.did(), {
      addProofs: true,
    })
    assert.deepEqual(claimedAsAgent.length, 2)
    assert.ok(
      claimedAsAgent.every((d) => d.audience.did() === agent.issuer.did())
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
      delegationFromAccountToSession?.cid.toString(),
      'ucan/attest proof cid matches delegation cid'
    )

    const accountProofs = [delegationFromAccountToSession, attestation]
    assert.ok(accountProofs)
  },
  'same agent, multiple accounts, provider/add': async (assert, context) => {
    const { connection, mail } = context

    const accounts = /** @type {const} */ ([
      Absentee.from({ id: 'did:mailto:dag.house:test-a' }),
      Absentee.from({ id: 'did:mailto:dag.house:test-b' }),
    ])

    const accessAgentData = await AgentData.create()
    const agent = await Agent.create(accessAgentData, {
      connection,
    })

    assert.deepEqual(
      countDelegations(accessAgentData),
      0,
      'agentData has zero delegations initially'
    )

    let expectedDataDelegations = 0
    for (const account of accounts) {
      // request agent authorization from account
      await requestAccess(agent, account, [{ can: '*' }])

      // confirm authorization
      const confirmationEmail = await mail.take()

      await confirmConfirmationUrl(agent.connection, confirmationEmail)
      // claim delegations after confirmation
      await claimAccess(agent, agent.issuer.did(), {
        addProofs: true,
        nonce: account.did(),
      })
      // expect two new delegations, [delegationFromAccount, attestationFromService]
      expectedDataDelegations += 2

      assert.deepEqual(
        countDelegations(accessAgentData),
        expectedDataDelegations,
        `agentData has ${expectedDataDelegations} after authorizing account ${account.did()} and claiming`
      )
    }

    for (const account of accounts) {
      // create space
      const spaceName = `space-test-${Math.random().toString().slice(2)}`
      const spaceCreation = await agent.createSpace(spaceName)
      const auth = await spaceCreation.createAuthorization(agent, {
        access: AgentAccess.spaceAccess,
        expiration: Infinity,
      })
      await agent.importSpaceFromDelegation(auth)

      // expect 1 new delegation from space.did() -> accessAgent.issuer.did()
      expectedDataDelegations += 1
      assert.deepEqual(
        countDelegations(accessAgentData),
        expectedDataDelegations,
        `agentData has ${expectedDataDelegations} after calling accessClientAgent.createSpace(...)`
      )

      await agent.setCurrentSpace(spaceCreation.did())

      const provider = /** @type {API.DID<'web'>} */ (agent.connection.id.did())
      await addProvider({
        access: agent,
        space: spaceCreation.did(),
        account,
        provider,
      })
    }
  },
  'can use second device with same account': async (assert, context) => {
    const { connection, mail } = context
    const email = 'example@dag.house'
    const account = Absentee.from({ id: DidMailto.fromEmail(email) })

    // first device
    const deviceA = await Agent.create(await AgentData.create(), {
      connection,
    })
    await requestAccess(deviceA, account, [{ can: '*' }])
    await confirmConfirmationUrl(deviceA.connection, await mail.take())
    await claimDelegations(deviceA)

    // deviceA creates a space
    const space1 = await createSpace(deviceA, account, assert)

    // second device
    const deviceB = await Agent.create(await AgentData.create(), {
      connection,
    })
    await requestAccess(deviceB, account, [{ can: '*' }])
    await confirmConfirmationUrl(deviceB.connection, await mail.take())
    await claimDelegations(deviceB)

    // issuer + account proofs should authorize deviceB to invoke space/info
    await assertCanSpaceInfo(deviceB, space1, assert)

    // deviceA creates another space
    const space2 = await createSpace(deviceA, account, assert)

    // deviceB claims delegations again
    await claimDelegations(deviceB)

    // now deviceB should be able to invoke space/info on space2
    await assertCanSpaceInfo(deviceB, space2, assert)
  },
  'cannot gain unattested access': async (assert, context) => {
    const { connection, mail } = context
    const email = 'example@dag.house'
    const account = Absentee.from({ id: DidMailto.fromEmail(email) })

    // first device
    const deviceA = await Agent.create(await AgentData.create(), {
      connection,
    })
    await requestAccess(deviceA, account, [{ can: '*' }])
    await confirmConfirmationUrl(deviceA.connection, await mail.take())
    await claimDelegations(deviceA)

    // deviceA creates a space
    const space = await createSpace(deviceA, account, assert)

    const accountCheater = Absentee.from({
      id: DidMailto.fromEmail('cheater@example.com'),
    })

    // second device is unrelated
    const deviceCheater = await Agent.create(await AgentData.create(), {
      connection,
    })

    await requestAccess(deviceCheater, accountCheater, [{ can: '*' }])
    await confirmConfirmationUrl(deviceCheater.connection, await mail.take())
    await claimDelegations(deviceCheater)

    const spaceCheater = await createSpace(
      deviceCheater,
      accountCheater,
      assert
    )

    // deviceCheater shouldn't have access to the space
    deviceCheater.setCurrentSpace(space.did())

    // deviceCheater tries to craft a delegation to gain access to the account
    const unattestedDelegation = await Top.top.delegate({
      issuer: Absentee.from({ id: account.did() }),
      audience: deviceCheater,
      with: 'ucan:*',
      expiration: Infinity,
      proofs: [],
    })

    // Then they store the delegation on the server
    const delegateResult = await AgentAccess.delegate(deviceCheater, {
      delegations: [unattestedDelegation],
      space: spaceCheater.did(),
    })

    assert.ok(
      delegateResult.ok,
      `delegateResult.error: ${delegateResult.error}`
    )

    // Then they claim their delegations. If their attack is successful, they,
    // now have access to the account and all its spaces.
    await claimDelegations(deviceCheater)

    // Assert that they still can't do anything to the space.
    await assert.rejects(
      deviceCheater.invokeAndExecute(Space.info, {
        with: space.did(),
      }),
      {
        message: `no proofs available for resource ${space.did()} and ability space/info`,
      }
    )
  },
  'can addSpacesFromDelegations': async (assert, context) => {
    const { agent } = await setup(context)
    await addSpacesFromDelegations(agent, [])
  },
  'authorize and wait': async (assert, context) => {
    const { accountEmail, account, agent, service, mail } = await setup({
      ...context,
      accountEmail: 'example+123@dag.house',
    })

    const deviceA = agent

    const authorized = authorizeAndWait(deviceA, accountEmail, {
      expectAuthorization: waitForAuthorizationByPolling,
    })
    const confirmationEmail = await mail.take()
    await confirmConfirmationUrl(deviceA.connection, confirmationEmail)
    await authorized

    const space = await deviceA.createSpace('test')
    await addProvider({
      access: deviceA,
      space: space.did(),
      account,
      provider: service.did(),
    })
    const auth = await space.createAuthorization(deviceA, {
      access: AgentAccess.spaceAccess,
      expiration: Infinity,
    })
    await deviceA.importSpaceFromDelegation(auth)
    const spaceInfoResult = await deviceA.invokeAndExecute(Space.info, {
      with: space.did(),
    })
    assert.equal(spaceInfoResult.out.error, undefined)

    assert.deepEqual(confirmationEmail.to, accountEmail, 'emails are equal')
  },
  'authorize with poll claim': async (assert, context) => {
    const { accountEmail, account, agent, service, mail } = await setup({
      ...context,
      accountEmail: 'example@dag.house',
    })

    const authorized = authorizeAndWait(agent, accountEmail, {
      expectAuthorization: waitForAuthorizationByPolling,
    })
    const confirmationEmail = await mail.take()
    await confirmConfirmationUrl(agent.connection, confirmationEmail)
    await authorized

    const space = await agent.createSpace('test')
    await addProvider({
      access: agent,
      space: space.did(),
      account,
      provider: service.did(),
    })
    const auth = await space.createAuthorization(agent, {
      access: AgentAccess.spaceAccess,
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)

    const spaceInfoResult = await agent.invokeAndExecute(Space.info, {
      with: space.did(),
    })

    assert.ok(spaceInfoResult.out.ok)
  },
  'can poll access/claim to know when confirmation happened': async (
    assert,
    context
  ) => {
    const { account, agent, mail } = await setup(context)

    // fire off request
    await requestAccess(agent, account, [{ can: '*' }])
    const claimed = pollAccessClaimUntil(
      delegationsIncludeSessionProof,
      agent,
      agent.issuer.did()
    )
    const confirmationEmail = await mail.take()
    await confirmConfirmationUrl(agent.connection, confirmationEmail)
    assert.equal([...(await claimed)].length, 2, 'claimed delegations')
  },
}

/**
 * @param {API.TestContext & { accountEmail?:`${string}@${string}` }} context
 */
const setup = async ({ accountEmail = 'alice@web.mail', ...context }) => {
  const space = alice
  const account = Absentee.from({ id: DidMailto.fromEmail(accountEmail) })
  const agent = await Agent.create(undefined, {
    connection: context.connection,
  })

  return { accountEmail, space, account, agent, ...context }
}

/** @param {AgentData} agentData */
const countDelegations = ({ delegations }) => [...delegations.values()].length
