import assert from 'assert'
import { URI } from '@ucanto/validator'
import { Agent } from '../src/agent.js'
import { StoreMemory } from '../src/stores/store-memory.js'
import { collect } from 'streaming-iterables'
import * as Account from '../src/capabilities/account.js'
import { createServer } from './helpers/utils.js'
import * as fixtures from './helpers/fixtures.js'

describe('Agent', function () {
  it('should fail if store is not initialized', async function () {
    const store = new StoreMemory()

    return assert.rejects(
      Agent.create({
        store,
      }),
      {
        name: 'Error',
        message: 'Store is not initialized, run "Store.init()" first.',
      }
    )
  })

  it('should return did', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
    })

    assert.ok(agent.did())
  })

  it('should create account', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
    })

    const account = await agent.createAccount('test-create')

    assert(typeof account.did === 'string')
    assert(account.proof)
  })

  it('should add proof when creating acccount', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
    })

    const account = await agent.createAccount('test-add')

    const delegations = await collect(agent.proofsWithMeta())

    assert.equal(account.proof.cid, delegations[0].delegation.cid)
    assert(!delegations[0].meta)
  })

  it('should set current account', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
    })

    const account = await agent.createAccount('test')

    await agent.setCurrentAccount(account.did)

    const accWithMeta = await agent.currentAccountWithMeta()
    if (!accWithMeta) {
      assert.fail('should have account')
    }
    assert.equal(accWithMeta.did, account.did)
    assert(accWithMeta.proofs.length === 1)
    assert.deepStrictEqual(accWithMeta.capabilities, ['*'])
  })

  it('fails set current account with no proofs', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
    })

    await assert.rejects(
      () => {
        return agent.setCurrentAccount(fixtures.alice.did())
      },
      {
        message: `Agent has no proofs for ${fixtures.alice.did()}.`,
      }
    )
  })

  it('should execute', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
      channel: createServer(),
    })

    const account = await agent.createAccount('execute')
    await agent.setCurrentAccount(account.did)

    const out = await agent.execute(Account.info, {
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

  it('should fail execute with no proofs', async function () {
    const store = await StoreMemory.create()
    const agent = await Agent.create({
      store,
      channel: createServer(),
    })

    await assert.rejects(
      async () => {
        await agent.execute(Account.info, {
          audience: fixtures.service,
          with: URI.from(fixtures.alice.did()),
        })
      },
      {
        name: 'Error',
        message: `no proofs available for resource ${URI.from(
          fixtures.alice.did()
        )} and ability account/info`,
      }
    )
  })

  it('should get account info', async function () {
    const store = await StoreMemory.create()
    const server = createServer()
    const agent = await Agent.create({
      store,
      channel: server,
    })

    // mock service
    // @ts-ignore
    agent.service = async () => server.id

    const account = await agent.createAccount('execute')
    await agent.setCurrentAccount(account.did)

    const out = await agent.getAccountInfo()
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
    const store = await StoreMemory.create()
    const server = createServer()
    const agent = await Agent.create({
      store,
      channel: server,
    })

    const account = await agent.createAccount('execute')
    await agent.setCurrentAccount(account.did)

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
        with: account.did,
      },
    ])
  })
})
