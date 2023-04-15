/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as assert from 'assert'
import * as discovery from '../src/index.js'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as principal from '@ucanto/principal'
import * as service from '../src/service.js'
import { connect as ucantoConnect } from '@ucanto/client'

/**
 * test using mocha
 *
 * @param {string} name - test name
 * @param {any} test - run the test
 * @returns {Promise<void>}
 */
const withMocha = async (name, test) => {
  it(name, test)
}

describe('discovery', () => {
  testDiscovery(discovery, withMocha)
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
    testDiscoveryAssertion(withMocha, assertion)
  }
}

/**
 * test discovery module
 *
 * @param {import("./test-types").TestAdder} test - add a named test
 * @param {import('../src/types.js').DiscoveryAssertion} assertion - kind of assertion to test
 */
function testDiscoveryAssertion(test, assertion) {
  // from spec
  test(`can discovery/assert/${assertion}`, async () => {
    const { id, server } = await setup()
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
  // proposed single ability and type of assertion is in input not Ability
  test(`can discovery/claim nb.type=${assertion}`, async () => {
    const { id, connection } = await setup()
    const invocation = Server.invoke({
      issuer: id,
      audience: id,
      capability: {
        can: `discovery/claim`,
        with: id.did(),
        nb: {
          type: /** @type {const} */ ('partition'),
        },
      },
    })
    const result = await invocation.execute(connection)
    assert.deepEqual(result.out.ok, {
      // it echos back type from invocation.nb.type
      type: invocation.capabilities[0].nb.type,
    })
  })
}

// eslint-disable-next-line jsdoc/require-jsdoc
async function setup() {
  const id = await principal.ed25519.generate()
  const service = discovery.service.create()
  const server = Server.create({
    codec: CAR.inbound,
    id,
    service,
  })
  const connection = ucantoConnect({
    id,
    codec: CAR.outbound,
    channel: server,
  })
  return { id, service, server, connection }
}

/**
 * @yields {import('../src/types.js').DiscoveryAssertion}
 */
function* iterateAssertions() {
  yield* /** @type {Iterable<import('../src/types.js').DiscoveryAssertion>} */ (
    Object.keys(service.create().discovery.assert)
  )
}
