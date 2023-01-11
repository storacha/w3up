import assert from 'assert'
import * as Store from '@web3-storage/capabilities/store'
import * as Upload from '@web3-storage/capabilities/upload'

describe('parserCapabilities', function () {
  it('can get all caps from Store.all', () => {
    // eslint-disable-next-line unicorn/no-array-reduce
    const caps = parserCapabilities(Store.all)
    const cans = new Set(caps.map((c) => c.can))
    const expectedCans = new Set(['store/add', 'store/remove', 'store/list'])
    for (const can of expectedCans) {
      assert.ok(cans.has(can), `parsed can=${can} from Store.all`)
    }
    for (const can of cans) {
      assert.ok(can.startsWith('store/'), `Store.all can starts with store/`)
    }
  })
  it('can get all caps from Upload.all', () => {
    // eslint-disable-next-line unicorn/no-array-reduce
    const caps = parserCapabilities(Upload.all)
    const cans = new Set(caps.map((c) => c.can))
    const expectedCans = new Set(['upload/add', 'upload/remove', 'upload/list'])
    for (const can of expectedCans) {
      assert.ok(cans.has(can), `parsed can=${can} from Upload.all`)
    }
    for (const can of cans) {
      assert.ok(can.startsWith('upload/'), `Upload.all can starts with upload/`)
    }
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
