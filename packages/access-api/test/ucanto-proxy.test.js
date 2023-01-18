import assert from 'assert'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as ed25519 from '@ucanto/principal/ed25519'
import { createProxyHandler } from '../src/ucanto/proxy.js'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as nodeHttp from 'node:http'
import {
  serverLocalUrl,
  ucantoServerNodeListener,
} from './helpers/upload-api.js'
import * as HTTP from '@ucanto/transport/http'
import { capability, URI, Failure } from '@ucanto/validator'
import * as Store from '@web3-storage/capabilities/store'

const top = capability({
  can: '*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

const testStar = top.derive({
  to: capability({
    can: 'test/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

const testBase = top.or(testStar)

const testSucceedComplex0 = testBase.derive({
  to: capability({
    can: 'test/succeed',
    with: URI.match({ protocol: 'did:' }),
    nb: {},
    derives: equalWith,
  }),
  derives: equalWith,
})

describe('ucanto-proxy', () => {
  it('proxies connection->server', async () => {
    // make a ucanto server that is the upstream
    const upstreamPrincipal = await ed25519.generate()
    /** @type {Array<[Ucanto.Invocation, unknown]>} */
    const testSucceedInvocations = []
    const testSucceedResponseFixture = { success: true }
    const upstream = Server.create({
      id: upstreamPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        test: {
          /**
           * @param {Ucanto.Invocation} invocation
           * @param {Ucanto.InvocationContext} context
           */
          succeed(invocation, context) {
            testSucceedInvocations.push([invocation, context])
            return testSucceedResponseFixture
          },
        },
      },
    })
    // make a ucanto server that is the proxy
    const proxyPrincipal = upstreamPrincipal
    // const proxyPrincipal = await ed25519.generate()
    const proxy = Server.create({
      id: proxyPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        test: {
          succeed: createProxyHandler({
            connections: {
              default: Client.connect({
                id: upstreamPrincipal,
                encoder: CAR,
                decoder: CBOR,
                channel: upstream,
              }),
            },
          }),
        },
      },
    })
    // create connection to proxy
    const proxyConnection = Client.connect({
      id: proxyPrincipal,
      encoder: CAR,
      decoder: CBOR,
      channel: proxy,
    })
    // invoke proxy
    const invoker = await ed25519.Signer.generate()
    const invocationCapability = {
      can: /** @type {const} */ ('test/succeed'),
      with: /** @type {const} */ ('did:web:dag.house'),
      nb: { foo: 'bar' },
    }
    const [result] = await proxyConnection.execute(
      Client.invoke({
        issuer: invoker,
        audience: proxyPrincipal,
        capability: invocationCapability,
      })
    )
    assert.equal(result?.error, undefined, 'result has no error')
    assert.equal(testSucceedInvocations.length, 1, 'upstream was invoked once')
    assert.deepEqual(
      testSucceedInvocations[0][0].capabilities[0],
      invocationCapability,
      'upstream received same capability as was sent to proxy'
    )
    assert.equal(result?.error, undefined, 'result has no error')
    assert.deepEqual(
      result,
      testSucceedResponseFixture,
      'proxy result is same returned from upstream'
    )
  })
  it('proxies connection->http->proxy->http->server', async () => {
    // make a ucanto server that is the upstream
    const upstreamDidWeb = /** @type {const} */ (`did:web:upstream.dag.house`)
    // eslint-disable-next-line unicorn/no-await-expression-member
    const upstreamPrincipal = (await ed25519.generate()).withDID(upstreamDidWeb)
    /** @type {Array<[Ucanto.Invocation, unknown]>} */
    const testSucceedInvocations = []
    const testSucceedResponseFixture = { success: true }
    const upstream = Server.create({
      id: upstreamPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        test: {
          succeed: Server.provide(
            testSucceedComplex0,
            async ({ invocation, context }) => {
              testSucceedInvocations.push([invocation, context])
              return testSucceedResponseFixture
            }
          ),
        },
      },
    })
    const upstreamHttp = nodeHttp.createServer(
      ucantoServerNodeListener(upstream)
    )
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      upstreamHttp.listen(0, () => resolve(undefined))
    })
    after(() => upstreamHttp.close())
    const upstreamUrl = serverLocalUrl(upstreamHttp.address())
    // make a ucanto server that is the proxy
    const proxyPrincipal = upstreamPrincipal
    // const proxyPrincipal = await ed25519.generate()
    const proxy = Server.create({
      id: proxyPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        test: {
          succeed: createProxyHandler({
            signer: proxyPrincipal,
            connections: {
              default: Client.connect({
                id: upstreamPrincipal,
                encoder: CAR,
                decoder: CBOR,
                channel: HTTP.open({
                  url: upstreamUrl,
                  fetch: globalThis.fetch,
                }),
              }),
            },
          }),
        },
      },
    })
    const proxyHttp = nodeHttp.createServer(ucantoServerNodeListener(proxy))
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      proxyHttp.listen(0, () => resolve(undefined))
    })
    after(() => proxyHttp.close())
    const proxyUrl = serverLocalUrl(proxyHttp.address())
    // create connection to proxy
    const proxyConnection = Client.connect({
      id: proxyPrincipal,
      encoder: CAR,
      decoder: CBOR,
      channel: HTTP.open({
        url: proxyUrl,
        fetch: globalThis.fetch,
      }),
    })
    // invoke proxy
    const invoker = await ed25519.Signer.generate()
    const invocationCapability = {
      can: /** @type {const} */ ('test/succeed'),
      with: /** @type {const} */ ('did:web:dag.house'),
      nb: { foo: 'bar' },
    }
    const [result] = await proxyConnection.execute(
      Client.invoke({
        issuer: invoker,
        audience: proxyPrincipal,
        capability: invocationCapability,
      })
    )
    try {
      assert.equal(result?.error, undefined, 'result has no error')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('expected non-error result but got', result)
      throw error
    }
    assert.equal(testSucceedInvocations.length, 1, 'upstream was invoked once')
    assert.deepEqual(
      testSucceedInvocations[0][0].capabilities[0],
      invocationCapability,
      'upstream received same capability as was sent to proxy'
    )
    assert.equal(result?.error, undefined, 'result has no error')
    assert.deepEqual(
      result,
      testSucceedResponseFixture,
      'proxy result is same returned from upstream'
    )
  })
  it('proxies store/list connection->http->proxy->http->server', async () => {
    // make a ucanto server that is the upstream
    const upstreamDidWeb = /** @type {const} */ (`did:web:upstream.dag.house`)
    // eslint-disable-next-line unicorn/no-await-expression-member
    const upstreamPrincipal = (await ed25519.generate()).withDID(upstreamDidWeb)
    /** @type {Array<[Ucanto.Invocation, unknown]>} */
    const testSucceedInvocations = []
    const testSucceedResponseFixture = { success: true }
    const upstream = Server.create({
      id: upstreamPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        store: {
          list: Server.provide(Store.list, async (invocation) => {
            testSucceedInvocations.push([
              invocation.invocation,
              invocation.context,
            ])
            return testSucceedResponseFixture
          }),
        },
      },
    })
    const upstreamHttp = nodeHttp.createServer(
      ucantoServerNodeListener(upstream)
    )
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      upstreamHttp.listen(0, () => resolve(undefined))
    })
    after(() => upstreamHttp.close())
    const upstreamUrl = serverLocalUrl(upstreamHttp.address())
    // make a ucanto server that is the proxy
    const proxyPrincipal = upstreamPrincipal
    // const proxyPrincipal = await ed25519.generate()
    const proxy = Server.create({
      id: proxyPrincipal,
      decoder: CAR,
      encoder: CBOR,
      service: {
        store: {
          list: createProxyHandler({
            signer: proxyPrincipal,
            connections: {
              default: Client.connect({
                id: upstreamPrincipal,
                encoder: CAR,
                decoder: CBOR,
                channel: HTTP.open({
                  url: upstreamUrl,
                  fetch: globalThis.fetch,
                }),
              }),
            },
          }),
        },
      },
    })
    const proxyHttp = nodeHttp.createServer(ucantoServerNodeListener(proxy))
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      proxyHttp.listen(0, () => resolve(undefined))
    })
    after(() => proxyHttp.close())
    const proxyUrl = serverLocalUrl(proxyHttp.address())
    // create connection to proxy
    const proxyConnection = Client.connect({
      id: proxyPrincipal,
      encoder: CAR,
      decoder: CBOR,
      channel: HTTP.open({
        url: proxyUrl,
        fetch: globalThis.fetch,
      }),
    })
    // invoke proxy
    const invoker = await ed25519.Signer.generate()
    const invocationCapability = {
      can: /** @type {const} */ ('store/list'),
      with: /** @type {const} */ ('did:web:dag.house'),
      nb: { foo: 'bar' },
    }
    const [result] = await proxyConnection.execute(
      Client.invoke({
        issuer: invoker,
        audience: proxyPrincipal,
        capability: invocationCapability,
      })
    )
    try {
      assert.equal(result?.error, undefined, 'result has no error')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('expected non-error result but got', result)
      throw error
    }
    assert.equal(testSucceedInvocations.length, 1, 'upstream was invoked once')
    assert.deepEqual(
      testSucceedInvocations[0][0].capabilities[0],
      invocationCapability,
      'upstream received same capability as was sent to proxy'
    )
    assert.equal(result?.error, undefined, 'result has no error')
    assert.deepEqual(
      result,
      testSucceedResponseFixture,
      'proxy result is same returned from upstream'
    )
  })
})

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {import('@ucanto/interface').ParsedCapability} child
 * @param {import('@ucanto/interface').ParsedCapability} parent
 */
function equalWith(child, parent) {
  return (
    child.with === parent.with ||
    new Failure(
      `Can not derive ${child.can} with ${child.with} from ${parent.with}`
    )
  )
}
