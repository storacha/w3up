import * as Test from '../test.js'
import { alice, bob, mallory } from '../fixtures/principals.js'
import * as Store from '../../src/agent/store.js'

/**
 * @type {Test.Suite}
 */
export const testAgentStore = {
  testLocalSpace: async (assert, { service, client }) => {
    const space = await client.createSpace('example')
    const proof = await space.createAuthorization(alice)

    const store = Store.from({ proofs: [proof] })

    assert.deepEqual([...Store.query(store, {})], [proof])
    assert.deepEqual(
      [...Store.query(store, { audience: Store.literal(alice.did()) })],
      [proof]
    )

    assert.deepEqual(
      [
        ...Store.query(store, {
          expiration: Store.integer().lessThan(Store.now()),
        }),
      ],
      [],
      'expires later than now'
    )

    assert.deepEqual(
      [
        ...Store.query(store, {
          expiration: Store.integer().greaterThan(Store.now()),
        }),
      ],
      [proof],
      'expires after now'
    )

    assert.deepEqual(
      [...Store.query(store, { audience: Store.literal(bob.did()) })],
      []
    )

    assert.deepEqual(
      [...Store.query(store, { can: Store.ability('store/add') })],
      [proof]
    )

    assert.deepEqual(
      [
        ...Store.query(store, {
          audience: Store.literal(alice.did()),
          expiration: Store.integer().greaterThan(Store.now()),
          with: Store.did({ method: 'key' }),
          can: Store.ability('store/remove'),
          nb: Store.struct({
            size: Store.integer().greaterThan(0),
          }),
        }),
      ],
      [],
      'nb.size is not specified'
    )

    assert.deepEqual(
      [
        ...Store.query(store, {
          audience: Store.literal(alice.did()),
          expiration: Store.integer().greaterThan(Store.now()),
          with: Store.did({ method: 'key' }),
          can: Store.ability('store/remove'),
          nb: Store.struct({
            size: Store.integer().greaterThan(0).optional(),
          }),
        }),
      ],
      [proof],
      'nb.size is optional'
    )
  },
}

Test.test({ AgentStore: testAgentStore })
