import assert, { AssertionError } from 'assert'
import * as Store from '@web3-storage/capabilities/store'
import * as Upload from '@web3-storage/capabilities/upload'
import { context } from './helpers/context.js'
import * as ucanto from '@ucanto/core'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { isUploadApiStack } from './helpers/utils.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import {
  createMockUploadApiServer,
  serverLocalUrl,
  ucantoServerNodeListener,
} from './helpers/upload-api.js'
import * as nodeHttp from 'node:http'

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
    const upstreamPrincipal = await ed25519.generate()
    const mockUpstream = createMockUploadApiServer({
      id: upstreamPrincipal,
    })
    const mockUpstreamHttp = nodeHttp.createServer(
      ucantoServerNodeListener(mockUpstream)
    )
    await new Promise((resolve, reject) =>
      // eslint-disable-next-line unicorn/no-useless-undefined
      mockUpstreamHttp.listen(0, () => resolve(undefined))
    )
    // now mockUpstreamHttp is listening on a port. If something goes wrong, we will close the server to have it stop litening
    after(() => {
      mockUpstreamHttp.close()
    })
    const mockUpstreamUrl = serverLocalUrl(mockUpstreamHttp.address())
    const { issuer, conn } = await context({
      env: {
        UPLOAD_API_URL: mockUpstreamUrl.toString(),
        // @ts-expect-error This expects did:web
        DID: upstreamPrincipal.did(),
      },
    })
    /** @type {Ucanto.ConnectionView<any>} */
    const connection = conn
    const invocation = ucanto.invoke({
      issuer,
      audience: upstreamPrincipal,
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
