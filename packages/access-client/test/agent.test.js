import assert from 'assert'
import { URI } from '@ucanto/validator'
import { Agent, connection } from '../src/agent.js'
import { AgentData } from '../src/agent-data.js'
import * as Space from '@web3-storage/capabilities/space'
import { createServer } from './helpers/utils.js'
import * as fixtures from './helpers/fixtures.js'

describe('Agent', function () {
  it('should return did', async function () {
    const data = await AgentData.create()
    const agent = new Agent(data)

    assert.ok(agent.did())
  })

  it('should create space', async function () {
    const data = await AgentData.create()
    const agent = new Agent(data)

    const space = await agent.createSpace('test-create')

    assert(typeof space.did === 'string')
    assert(space.proof)
  })

  it('should add proof when creating acccount', async function () {
    const data = await AgentData.create()
    const agent = new Agent(data)

    const space = await agent.createSpace('test-add')

    const delegations = await agent.proofs()

    assert.equal(space.proof.cid, delegations[0].cid)
  })

  it('should set current space', async function () {
    const data = await AgentData.create()
    const agent = new Agent(data)

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
    const data = await AgentData.create()
    const agent = new Agent(data)

    await assert.rejects(
      () => {
        return agent.setCurrentSpace(fixtures.alice.did())
      },
      {
        message: `Agent has no proofs for ${fixtures.alice.did()}.`,
      }
    )
  })

  it('should invoke and execute', async function () {
    const data = await AgentData.create()
    const agent = new Agent(data, {
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
    const data = await AgentData.create()
    const agent = new Agent(data, {
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
    const data = await AgentData.create()
    const agent = new Agent(data, {
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
    const data = await AgentData.create()
    const agent = new Agent(data, {
      connection: connection({ channel: server }),
    })

    // mock service
    // @ts-ignore
    agent.service = async () => server.id

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
    const data = await AgentData.create()
    const agent = new Agent(data, {
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
})
