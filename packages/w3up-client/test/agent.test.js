import * as Test from './test.js'
import { alice, bob, mallory, service } from './fixtures/principals.js'
import * as API from '../src/types.js'
import * as Agent from '../src/agent.js'
import * as Result from '../src/result.js'

/**
 * @type {Test.BasicSuite}
 */
export const testAgent = {
  'agent has did method': async (assert) => {
    const result = await Agent.open({
      as: alice,
      store: Agent.ephemeral,
    }).connect()

    assert.ok(result.ok)
    const session = Result.unwrap(result)
    assert.ok(session.agent)
    assert.ok(session.connection)

    assert.deepEqual(session.agent.did(), alice.did())

    assert.deepEqual(session.connection.address, {
      id: Agent.DID.parse('did:web:web3.storage'),
      url: new URL('https://up.web3.storage'),
    })
  },

  'agent fails load if no principal': async (assert) => {
    const result = await Agent.load({ store: Agent.ephemeral })

    assert.equal(result?.error?.name, 'SignerLoadError')
  },

  'agent loads from store': async (assert) => {
    const result = await Agent.load({
      store: {
        ...Agent.ephemeral,
        async load() {
          return {
            principal: alice.toArchive(),
            delegations: new Map(),
            currentSpace: undefined,
            address: {},
          }
        },
      },
    })

    assert.ok(result?.ok)
    assert.deepEqual(result?.ok?.did(), alice.did())
  },
  'load from store but use different signer': async (assert) => {
    const result = await Agent.load({
      as: bob,
      store: {
        ...Agent.ephemeral,
        async load() {
          return {
            principal: alice.toArchive(),
            delegations: new Map(),
            currentSpace: undefined,
            address: {},
          }
        },
      },
    })

    assert.ok(result?.ok)
    const agent = Result.unwrap(result)
    assert.deepEqual(agent.did(), bob.did())
    assert.deepEqual(
      agent.db.signer?.id,
      alice.did(),
      'signer in db remains same'
    )

    const tr = await Agent.DB.transact(agent.db, [
      {
        signer: bob.toArchive(),
      },
    ])

    assert.ok(tr.ok)
    assert.deepEqual(agent.db.signer?.id, bob.did(), 'signer was updated')
  },
}

Test.basic({ Agent: testAgent })
