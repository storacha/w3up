import assert from 'assert'
import * as ucanto from '@ucanto/core'
import { URI } from '@ucanto/validator'
import { Delegation, provide } from '@ucanto/server'
import { Agent, Access, AgentData, connection } from '../src/agent.js'
import * as Space from '@web3-storage/capabilities/space'
import { createServer } from './helpers/utils.js'
import * as fixtures from './helpers/fixtures.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import { UCAN, Provider } from '@web3-storage/capabilities'
import { Absentee } from '@ucanto/principal'
import * as DidMailto from '@web3-storage/did-mailto'
import * as API from '../src/types.js'

describe('Agent', function () {
  it('should return did', async function () {
    const agent = await Agent.create()

    assert.ok(agent.did())
  })

  it('should create space', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test-create')

    assert(typeof space.did() === 'string')
  })

  it('should add proof when creating account', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test-add')
    const authorization = await space.createAuthorization(agent, {
      access: { '*': {} },
      expiration: Infinity,
    })

    await agent.importSpaceFromDelegation(authorization)
    const delegations = agent.proofs()

    assert.equal(authorization.cid, delegations[0].cid)
  })

  it('should set current space', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test')
    const authorization = await space.createAuthorization(agent, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })

    await agent.importSpaceFromDelegation(authorization)

    await agent.setCurrentSpace(space.did())

    const accWithMeta = await agent.currentSpaceWithMeta()
    if (!accWithMeta) {
      assert.fail('should have space')
    }
    assert.equal(accWithMeta.did, space.did())
    assert(accWithMeta.proofs.length === 1)
    assert.deepStrictEqual(
      accWithMeta.capabilities,
      Object.keys(Access.spaceAccess)
    )
  })

  it('fails set current space with no proofs', async function () {
    const agent = await Agent.create()

    await assert.rejects(
      () => {
        return agent.setCurrentSpace(fixtures.alice.did())
      },
      {
        message: `Agent has no proofs for ${fixtures.alice.did()}.`,
      }
    )
  })

  it('should allow import a space', async () => {
    const alice = await Agent.create()
    const bob = await Agent.create()

    const space = await alice.createSpace('videos')
    const auth = await space.createAuthorization(alice, {
      access: { '*': {} },
      expiration: Infinity,
    })
    await alice.importSpaceFromDelegation(auth)
    await alice.setCurrentSpace(space.did())

    const proof = await alice.delegate({
      audience: bob,
      audienceMeta: { name: 'videos', type: 'app' },
      abilities: ['*'],
    })

    await bob.importSpaceFromDelegation(proof)
    await bob.setCurrentSpace(space.did())

    const proofs = bob.proofs([{ can: 'store/add', with: space.did() }])
    assert(proofs.length)
  })

  it('should allow import a space with restricted abilities', async () => {
    const alice = await Agent.create()
    const bob = await Agent.create()

    const space = await alice.createSpace('videos')
    const auth = await space.createAuthorization(alice, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await alice.importSpaceFromDelegation(auth)
    await alice.setCurrentSpace(space.did())

    const proof = await alice.delegate({
      audience: bob,
      audienceMeta: { name: 'videos', type: 'app' },
      abilities: ['store/add'],
    })

    await bob.importSpaceFromDelegation(proof)
    await bob.setCurrentSpace(space.did())

    const proofs = bob.proofs([{ can: 'store/add', with: space.did() }])
    assert(proofs.length)
  })

  it('should invoke and execute', async function () {
    const agent = await Agent.create(undefined, {
      connection: connection({ channel: createServer() }),
    })

    const space = await agent.createSpace('execute')
    const auth = await space.createAuthorization(agent, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)
    await agent.setCurrentSpace(space.did())

    const { out } = await agent.invokeAndExecute(Space.info, {
      audience: fixtures.service,
    })

    assert.deepEqual(out.ok, {
      did: 'did:key:sss',
      agent: 'did:key:agent',
      email: 'mail@mail.com',
      product: 'product:free',
      updated_at: 'sss',
      inserted_at: 'date',
    })
  })

  it('should execute', async function () {
    const agent = await Agent.create(undefined, {
      connection: connection({ channel: createServer() }),
    })

    const space = await agent.createSpace('execute')
    const auth = await space.createAuthorization(agent, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)
    await agent.setCurrentSpace(space.did())

    const i1 = await agent.invoke(Space.info, {
      audience: fixtures.service,
    })

    const receipts = await agent.execute(i1)

    assert.deepStrictEqual(
      receipts.map(($) => $.out),
      [
        {
          ok: {
            did: 'did:key:sss',
            agent: 'did:key:agent',
            email: 'mail@mail.com',
            product: 'product:free',
            updated_at: 'sss',
            inserted_at: 'date',
          },
        },
      ]
    )
  })

  it('should fail execute with no proofs', async function () {
    const agent = await Agent.create(undefined, {
      connection: connection({ channel: createServer() }),
    })

    await assert.rejects(
      async () => {
        await agent.invokeAndExecute(Space.info, {
          audience: fixtures.service,
          with: URI.from(fixtures.alice.did()),
        })
      },
      {
        name: 'Error',
        message: `no proofs available for resource ${URI.from(
          fixtures.alice.did()
        )} and ability space/info`,
      }
    )
  })

  it('should get space info', async function () {
    const server = createServer()
    const agent = await Agent.create(undefined, {
      connection: connection({ principal: server.id, channel: server }),
    })

    const space = await agent.createSpace('execute')
    const auth = await space.createAuthorization(agent, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)
    await agent.setCurrentSpace(space.did())

    const out = await agent.getSpaceInfo()
    assert.deepEqual(out, {
      did: 'did:key:sss',
      agent: 'did:key:agent',
      email: 'mail@mail.com',
      product: 'product:free',
      updated_at: 'sss',
      inserted_at: 'date',
    })
  })

  it('should delegate', async function () {
    const server = createServer()
    const agent = await Agent.create(undefined, {
      connection: connection({ channel: server }),
    })

    const space = await agent.createSpace('execute')
    const auth = await space.createAuthorization(agent, {
      access: { '*': {} },
      expiration: Infinity,
    })
    await agent.importSpaceFromDelegation(auth)
    await agent.setCurrentSpace(space.did())

    const out = await agent.delegate({
      abilities: ['*'],
      audience: fixtures.alice,
      audienceMeta: {
        name: 'sss',
        type: 'app',
      },
    })

    assert(out.audience.did() === fixtures.alice.did())
    assert.deepStrictEqual(out.capabilities, [
      {
        can: '*',
        with: space.did(),
      },
    ])
  })

  it('should not create delegation without proof', async function () {
    const server = createServer()
    const alice = await Agent.create(undefined, {
      connection: connection({ channel: server }),
    })
    const bob = await Agent.create(undefined, {
      connection: connection({ channel: server }),
    })

    const space = await alice.createSpace('execute')
    const auth = await space.createAuthorization(alice, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await alice.importSpaceFromDelegation(auth)
    await alice.setCurrentSpace(space.did())

    const delegation = await alice.delegate({
      abilities: ['space/info'],
      audience: bob,
      audienceMeta: { name: 'sss', type: 'app' },
    })

    await bob.importSpaceFromDelegation(delegation)
    await bob.setCurrentSpace(space.did())

    // should not be able to store/remove - bob only has ability to space/info
    await assert.rejects(
      () =>
        bob.delegate({
          abilities: ['store/remove'],
          audience: fixtures.mallory,
          audienceMeta: { name: 'sss', type: 'app' },
        }),
      /cannot delegate capability store\/remove/
    )
  })

  it('should revoke', async function () {
    const server = createServer({
      ucan: {
        /**
         *
         * @type {import('@ucanto/interface').ServiceMethod<import('../src/types.js').UCANRevoke, import('../src/types.js').UCANRevokeSuccess, import('../src/types.js').UCANRevokeFailure>}
         */
        revoke: provide(UCAN.revoke, async ({ capability, invocation }) => {
          // copy a bit of the production revocation handler to do basic validation
          const { nb: input } = capability
          const ucan = Delegation.view(
            { root: input.ucan, blocks: invocation.blocks },
            null
          )
          return ucan
            ? { ok: { time: Date.now() / 1000 } }
            : {
                error: {
                  name: 'UCANNotFound',
                  message: 'Could not find delegation in invocation blocks',
                },
              }
        }),
      },
    })
    const alice = await Agent.create(undefined, {
      connection: connection({ principal: server.id, channel: server }),
    })
    const bob = await Agent.create(undefined, {
      connection: connection({ principal: server.id, channel: server }),
    })
    const mallory = await Agent.create(undefined, {
      connection: connection({ principal: server.id, channel: server }),
    })

    const space = await alice.createSpace('alice')
    const aliceAuth = await space.createAuthorization(alice, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await alice.importSpaceFromDelegation(aliceAuth)
    await alice.setCurrentSpace(space.did())

    const delegation = await alice.delegate({
      abilities: ['store/add'],
      audience: bob.issuer,
      audienceMeta: {
        name: 'sss',
        type: 'app',
      },
    })

    // revocation should work without a list of proofs
    const result = await alice.revoke(delegation.cid)
    assert(result.ok, `failed to revoke: ${result.error?.message}`)

    // and it should not fail if you pass additional proofs
    const result2 = await alice.revoke(delegation.cid, { proofs: [] })
    assert(
      result2.ok,
      `failed to revoke when proofs passed: ${result2.error?.message}`
    )

    const bobSpace = await bob.createSpace('bob')
    const bobAuth = await bobSpace.createAuthorization(bob, {
      access: Access.spaceAccess,
      expiration: Infinity,
    })
    await bob.importSpaceFromDelegation(bobAuth)
    await bob.setCurrentSpace(bobSpace.did())
    const bobDelegation = await bob.delegate({
      abilities: ['store/add'],
      audience: mallory.issuer,
      audienceMeta: {
        name: 'sss',
        type: 'app',
      },
    })

    // if the delegation wasn't generated by the agent and isn't passed, revoke will throw
    const result3 = await alice.revoke(bobDelegation.cid)
    assert(
      result3.error,
      `revoke resolved but should have rejected because delegation is not passed`
    )

    // but it should succeed if the delegation is passed
    const result4 = await alice.revoke(bobDelegation.cid, {
      proofs: [bobDelegation],
    })
    assert(
      result4.ok,
      `failed to revoke even though proof was passed: ${result4.error?.message}`
    )

    // bob should be able to revoke his own delegation
    const result5 = await bob.revoke(bobDelegation.cid)
    assert(result5.ok, `failed to revoke: ${result5.error?.message}`)
  })

  /**
   * An agent may manage a bunch of different proofs for the same agent key. e.g. proofs may authorize agent key to access various other service providers, each of which may have issued its own session.
   * When one of the proofs is a session proof issued by w3upA or w3upB, the Agent#proofs result should contain proofs appropriate for the session host.
   */
  it('can filter proofs based on sessionProofIssuer', async () => {
    const account = DidMailto.fromEmail(
      `test-${Math.random().toString().slice(2)}@dag.house`
    )
    const serviceA = await ed25519.Signer.generate()
    const serviceAWeb = serviceA.withDID('did:web:a.up.web3.storage')
    const serviceB = await ed25519.Signer.generate()
    const serviceBWeb = serviceB.withDID('did:web:b.up.web3.storage')

    const server = createServer()
    const agentData = await AgentData.create()
    const agent = new Agent(agentData, {
      connection: connection({ channel: server }),
    })

    // the agent has a delegation+sesssion for each service
    const services = [serviceAWeb, serviceBWeb]
    for (const service of services) {
      // note: these delegations will have the same CID regardless of `service`
      const delegation = await ucanto.delegate({
        issuer: Absentee.from({ id: account }),
        audience: agent,
        capabilities: [
          {
            can: 'provider/add',
            with: 'ucan:*',
          },
        ],
      })
      const session = await UCAN.attest.delegate({
        issuer: service,
        audience: agent,
        with: service.did(),
        nb: { proof: delegation.cid },
      })
      await agent.addProof(delegation)
      await agent.addProof(session)
    }
    const proofsForService = agent.proofs([
      { can: 'provider/add', with: account },
    ])
    assert.ok(proofsForService, 'proofs returned some proofs')

    for (const service of [serviceAWeb, serviceBWeb]) {
      assert.ok(
        proofsForService.find((proof) =>
          matchSessionProof(proof, service.did())
        ),
        'proofs returns a session proof signed by service'
      )
    }
  })

  it('invoke() chooses proofs appropriate for invocation audience', async () => {
    const space = await ed25519.Signer.generate()
    const account = DidMailto.fromEmail(
      `test-${Math.random().toString().slice(2)}@dag.house`
    )
    const serviceA = await ed25519.Signer.generate()
    const serviceAWeb = serviceA.withDID('did:web:a.up.web3.storage')
    const serviceB = await ed25519.Signer.generate()
    const serviceBWeb = serviceB.withDID('did:web:b.up.web3.storage')

    const server = createServer()
    const agentData = await AgentData.create()
    const agent = new Agent(agentData, {
      connection: connection({ channel: server }),
    })

    // the agent has a delegation+sesssion for each service
    const services = [serviceAWeb, serviceBWeb]
    for (const service of services) {
      const nonce = (await ed25519.Signer.generate()).did()
      const delegation = await ucanto.delegate({
        issuer: Absentee.from({ id: account }),
        audience: agent,
        capabilities: [
          {
            can: 'provider/add',
            with: 'ucan:*',
          },
        ],
        facts: [{ nonce }],
      })
      const session = await UCAN.attest.delegate({
        issuer: service,
        audience: agent,
        with: service.did(),
        nb: { proof: delegation.cid },
      })
      await agent.addProof(delegation)
      await agent.addProof(session)
    }

    /**
     * now let's consider a new Agent that reuses the AgentData for the first agent. e.g. in the common case of an Agent being instantiated with an pre-existing AgentData.
     * Unlike the first agentA which made connections to serviceA, this agentB has a connection to serviceB. But all these Agents reuse an underlying AgentData with proofs for everyone.
     * That Agent should be able to call proofs to get proofs incl. sessionProofs issued by that invo
     */

    const agentConnectedToServiceB = new Agent(agentData, {
      connection: connection({
        principal: serviceB,
        channel: server,
      }),
    })

    const proofsForProviderAdd = agentConnectedToServiceB.proofs([
      {
        can: 'provider/add',
        with: account,
      },
    ])
    assert.ok(proofsForProviderAdd)
    assert.ok(
      proofsForProviderAdd.find((proof) =>
        matchSessionProof(proof, serviceBWeb.did())
      ),
      'proofs returns a session proof signed by serviceBWeb'
    )

    const providerAddInvocation = await agentConnectedToServiceB.invoke(
      Provider.add,
      {
        audience: serviceBWeb,
        with: /** @type {API.AccountDID} */ (account),
        nb: {
          provider: serviceBWeb.did(),
          consumer: space.did(),
        },
      }
    )

    const proofIssuedByServiceB = providerAddInvocation.proofs.find((proof) => {
      if (!('capabilities' in proof)) {
        return false
      }
      return matchSessionProof(proof, serviceBWeb.did())
    })
    assert.ok(proofIssuedByServiceB)
    assert.ok(
      'issuer' in proofIssuedByServiceB,
      'session proof on invocation is a delegation and not just a link'
    )
    assert.equal(
      proofIssuedByServiceB.issuer.did(),
      serviceBWeb.did(),
      'agent invoke method built an invocation containing the session proof issued by the right invocation audience'
    )

    // There should not be a session proof issued by serviceA.
    // because this invocation's audience is serviceB
    const proofIssuedByServiceA = providerAddInvocation.proofs.find(
      (proof) =>
        'capabilities' in proof && matchSessionProof(proof, serviceAWeb.did())
    )
    assert.ok(
      !proofIssuedByServiceA,
      'invocation for serviceBWeb does not have sessionProof from serviceAWeb'
    )
  })
})

/**
 * @param {import('@ucanto/interface').Delegation} proof
 * @param {import('@ucanto/interface').DID} [issuer] - if provided, only return true if the session proof is issued by this issuer
 */
function matchSessionProof(proof, issuer) {
  if (!proof.capabilities.some((cap) => cap.can === 'ucan/attest')) {
    return false
  }
  if (issuer !== undefined && proof.issuer.did() !== issuer) {
    return false
  }
  return true
}
