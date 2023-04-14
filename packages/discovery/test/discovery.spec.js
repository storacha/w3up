import * as assert from 'assert'
import * as discovery from '../src/index.js'
import { invoke } from '@ucanto/core'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as principal from '@ucanto/principal'

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
  test('can discovery/assert/location', async () => {
    const id = await principal.ed25519.generate()
    const service = discovery.service.create()
    const server = Server.create({
      codec: CAR.inbound,
      id,
      service,
    })
    const claimResult = await server.run(invoke({
      issuer: id,
      audience: id,
      capability: {
        can: /** @type {const} */ ('discovery/assert/location'),
        with: id.did(),
        nb: {},
      }
    }))
    assert.deepEqual(claimResult.out.ok, {})
  })
}
