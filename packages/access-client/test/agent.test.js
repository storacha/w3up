import assert from 'assert'
import { URI } from '@ucanto/validator'
import { Agent, connection } from '../src/agent.js'
import * as Space from '@web3-storage/capabilities/space'
import { createServer } from './helpers/utils.js'
import * as fixtures from './helpers/fixtures.js'

describe('Agent', function () {
  it('should return did', async function () {
    const agent = await Agent.create()

    assert.ok(agent.did())
  })

  it('should create space', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test-create')

    assert(typeof space.did === 'string')
    assert(space.proof)
  })

  it('should add proof when creating acccount', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test-add')
    const delegations = agent.proofs()

    assert.equal(space.proof.cid, delegations[0].cid)
  })

  it('should set current space', async function () {
    const agent = await Agent.create()
    const space = await agent.createSpace('test')

    await agent.setCurrentSpace(space.did)

    const accWithMeta = await agent.currentSpaceWithMeta()
    if (!accWithMeta) {
      assert.fail('should have space')
    }
    assert.equal(accWithMeta.did, space.did)
    assert(accWithMeta.proofs.length === 1)
    assert.deepStrictEqual(accWithMeta.capabilities, ['*'])
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
    await alice.setCurrentSpace(space.did)

    const proof = await alice.delegate({
      audience: bob,
      audienceMeta: { name: 'videos', type: 'app' },
      abilities: ['*'],
    })

    await bob.importSpaceFromDelegation(proof)
    await bob.setCurrentSpace(space.did)

    const proofs = bob.proofs([{ can: 'store/add', with: space.did }])
    assert(proofs.length)
  })

  it('should allow import a space with restricted abilities', async () => {
    const alice = await Agent.create()
    const bob = await Agent.create()

    const space = await alice.createSpace('videos')
    await alice.setCurrentSpace(space.did)

    const proof = await alice.delegate({
      audience: bob,
      audienceMeta: { name: 'videos', type: 'app' },
      abilities: ['store/add'],
    })

    await bob.importSpaceFromDelegation(proof)
    await bob.setCurrentSpace(space.did)

    const proofs = bob.proofs([{ can: 'store/add', with: space.did }])
    assert(proofs.length)
  })

  it('should invoke and execute', async function () {
    const agent = await Agent.create(undefined, {
      connection: connection({ channel: createServer() }),
    })

    const space = await agent.createSpace('execute')
    await agent.setCurrentSpace(space.did)

    const out = await agent.invokeAndExecute(Space.info, {
      audience: fixtures.service,
    })

    assert.deepEqual(out, {
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
    await agent.setCurrentSpace(space.did)

    const i1 = await agent.invoke(Space.info, {
      audience: fixtures.service,
    })
    const i2 = await agent.invoke(Space.recover, {
      audience: fixtures.service,
      nb: {
        identity: 'mailto: email@gmail.com',
      },
    })

    const out = await agent.execute(i1, i2)

    assert.deepStrictEqual(out, [
      {
        did: 'did:key:sss',
        agent: 'did:key:agent',
        email: 'mail@mail.com',
        product: 'product:free',
        updated_at: 'sss',
        inserted_at: 'date',
      },
      {
        recover: true,
      },
    ])
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
    await agent.setCurrentSpace(space.did)

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
    await agent.setCurrentSpace(space.did)

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
        with: space.did,
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
    await alice.setCurrentSpace(space.did)

    const delegation = await alice.delegate({
      abilities: ['space/info'],
      audience: bob,
      audienceMeta: { name: 'sss', type: 'app' },
    })

    await bob.importSpaceFromDelegation(delegation)
    await bob.setCurrentSpace(space.did)

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
})
