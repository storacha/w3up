import assert from 'assert'
import * as Store from '@web3-storage/capabilities/store'

describe('upload-api-proxy', function () {
  it('can get all caps from Store.all', () => {
    // eslint-disable-next-line unicorn/no-array-reduce
    const storeCaps = parserCapabilities(Store.all)
    const capCans = new Set(storeCaps.map((c) => c.can))
    const expectedCans = new Set(['store/add', 'store/remove', 'store/list'])
    for (const can of expectedCans) {
      assert.ok(capCans.has(can), `parsed can=${can} from Store.all`)
    }
    for (const can of capCans) {
      assert.ok(can.startsWith('store/'), `Store.all can starts with store/`)
    }
    assert.ok(storeCaps.length >= 3)
  })
})

/**
 * @param {import('@ucanto/interface').CapabilityParser<any>} cap
 * @returns string[]
 */
function parserCapabilities(cap) {
  const caps = cap
    .toString()
    .split('|')
    .map((s) => /** @type {unknown} */ (JSON.parse(s)))
    .map((c) => {
      assert.ok(c && typeof c === 'object', 'cap is an object')
      assert.ok('can' in c && typeof c.can === 'string', 'c.can is a string')
      return {
        can: c.can,
      }
    })
  return caps
}
