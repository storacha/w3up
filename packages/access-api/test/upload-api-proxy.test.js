import assert, { AssertionError } from 'assert'
import * as Store from '@web3-storage/capabilities/store'
import * as Upload from '@web3-storage/capabilities/upload'
import { context } from './helpers/context.js'
import * as ucanto from '@ucanto/core'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { isUploadApiStack } from './helpers/utils.js'

describe('parserCapabilities', function () {
  it('can get all caps from Store.all', () => {
    const cans = parserAbilities(Store.all)
    /** @type {Set<Ucanto.Ability>} */
    const expectedCans = new Set(['store/add', 'store/remove', 'store/list'])
    for (const can of expectedCans) {
      assert.ok(cans.has(can), `parsed can=${can} from Store.all`)
    }
    for (const can of cans) {
      assert.ok(can.startsWith('store/'), `Store.all can starts with store/`)
    }
  })
  it('can get all caps from Upload.all', () => {
    const cans = parserAbilities(Upload.all)
    /** @type {Set<Ucanto.Ability>} */
    const expectedCans = new Set(['upload/add', 'upload/remove', 'upload/list'])
    for (const can of expectedCans) {
      assert.ok(cans.has(can), `parsed can=${can} from Upload.all`)
    }
    for (const can of cans) {
      assert.ok(can.startsWith('upload/'), `Upload.all can starts with upload/`)
    }
  })
})

describe('Store.all', () => {
  for (const can of parserAbilities(Store.all)) {
    it(`proxies ${can} to upload-api`, testCanProxyInvocation(can))
  }
})

describe('Upload.all', () => {
  for (const can of parserAbilities(Upload.all)) {
    it(`proxies ${can} to upload-api`, testCanProxyInvocation(can))
  }
})

/**
 * @param {Ucanto.Ability} can
 */
function testCanProxyInvocation(can) {
  return async () => {
    const { service: serviceSigner, issuer, conn } = await context()
    /** @type {Ucanto.ConnectionView<any>} */
    const connection = conn
    const service = process.env.DID
      ? serviceSigner.withDID(ucanto.DID.parse(process.env.DID).did())
      : serviceSigner
    const invocation = ucanto.invoke({
      issuer,
      audience: service,
      capability: {
        can,
        with: `https://dag.house`,
        nb: {},
      },
    })
    const [result] = await connection.execute(invocation)
    try {
      if ('error' in result) {
        assert.ok(
          'stack' in result && typeof result.stack === 'string',
          'error.stack is a string'
        )
        assert.ok(
          isUploadApiStack(result.stack),
          'error.stack appears to be from upload-api'
        )
      }
    } catch (error) {
      if (error instanceof AssertionError) {
        // eslint-disable-next-line no-console
        console.warn(`unexpected result`, result)
      }
      throw error
    }
  }
}

/**
 * @param {Ucanto.CapabilityParser<any>} cap
 * @returns {Set<Ucanto.Ability>}
 */
function parserAbilities(cap) {
  const cans = new Set(
    cap
      .toString()
      .split('|')
      .map((s) => /** @type {unknown} */ (JSON.parse(s)))
      .map((c) => {
        assert.ok(c && typeof c === 'object', 'cap is an object')
        assert.ok('can' in c && typeof c.can === 'string', 'c.can is a string')
        const [ns, firstSegment, ...restSegments] = c.can.split('/')
        assert.equal(
          restSegments.length,
          0,
          'only two /-delimited segments in can'
        )
        /** @type {Ucanto.Ability} */
        const can = `${ns}/${firstSegment}`
        return can
      })
  )
  return cans
}
