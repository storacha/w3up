/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as assert from 'assert'
import * as discovery from '../src/index.js'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as principal from '@ucanto/principal'
import * as service from '../src/service.js'

describe('discovery', () => {
  testDiscovery(discovery, async (name, test) => it(name, test))
})

/**
 * test discovery module
 *
 * @param {typeof discovery} module - discovery module to test
 * @param {import("./test-types").TestAdder} test - add a named test
 */
function testDiscovery(module, test) {
  test('is an object', async () => {
    assert.equal(typeof module, 'object')
  })
  for (const assertion of iterateAssertions()) {
    test(`can discovery/assert/${assertion}`, async () => {
      const id = await principal.ed25519.generate()
      const service = discovery.service.create()
      const server = Server.create({
        codec: CAR.inbound,
        id,
        service,
      })
      const invocation = await Server.invoke({
        issuer: id,
        audience: id,
        capability: {
          can: `discovery/assert/${assertion}`,
          with: id.did(),
          nb: {},
        },
      }).buildIPLDView()
      const result = await server.service.discovery.assert[assertion](
        // @ts-ignore - confused by [assertion] lookup
        invocation,
        { id, principal: principal.Verifier }
      )
      assert.deepEqual(result.ok, {
        status: 200,
      })
    })
  }
}

// eslint-disable-next-line jsdoc/require-yields
/**
 * @returns {IterableIterator<import('../src/types.js').DiscoveryAssertion>} - assertions
 */
function* iterateAssertions() {
  yield* /** @type {Iterable<import('../src/types.js').DiscoveryAssertion>} */ (
    Object.keys(service.create().discovery.assert)
  )
}
