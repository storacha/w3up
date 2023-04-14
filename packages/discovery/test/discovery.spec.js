import * as assert from 'assert'
import * as discovery from '../src/index.js'

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
  test('has assert method', async () => {
    assert.equal(typeof module.assert, 'function')
  })
}
