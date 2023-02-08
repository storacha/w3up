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
import { listen, ucantoServerNodeListener } from './helpers/upload-api.js'
import * as HTTP from '@ucanto/transport/http'

describe('ucanto-proxy', () => {
  it('proxies invocations to another ucanto server', async () => {
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
  it('when upstream responds with status=500, proxy responds with status=502 Bad Gateway', async () => {
    const upstreamPrincipal = await ed25519.generate()
    const stubbedUpstreamResponse = {
      status: 532,
      statusText: 'Bad Gateway Test',
    }
    // create upstream
    const upstreamHttpServer = nodeHttp.createServer((request, response) => {
      response.writeHead(
        stubbedUpstreamResponse.status,
        stubbedUpstreamResponse.statusText
      )
      response.end()
    })
    after(() => upstreamHttpServer.close())
    const upstreamUrl = await listen(upstreamHttpServer)
    // create the proxy that will proxy requests to the upstream
    const proxy = Server.create({
      id: upstreamPrincipal,
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
                channel: HTTP.open({
                  url: upstreamUrl,
                }),
              }),
            },
          }),
        },
      },
    })
    const proxyHttpServer = nodeHttp.createServer(
      ucantoServerNodeListener(proxy)
    )
    after(() => proxyHttpServer.close())
    const proxyUrl = await listen(proxyHttpServer)
    const proxyConnection = Client.connect({
      id: upstreamPrincipal,
      encoder: CAR,
      decoder: CBOR,
      channel: HTTP.open({ url: proxyUrl }),
    })

    // invoke the proxy
    const invoker = await ed25519.Signer.generate()
    const [result] = await proxyConnection.execute(
      Client.invoke({
        issuer: invoker,
        audience: upstreamPrincipal,
        capability: {
          can: 'test/succeed',
          with: /** @type {const} */ ('did:web:dag.house'),
        },
      })
    )

    assert.equal(result?.error, true, 'result has error=true')
    assert.equal(
      'status' in result && result?.status,
      502,
      'result has status=502'
    )
    assert.equal(
      'statusText' in result && result?.statusText,
      'Bad Gateway',
      'result has statusText'
    )
    assert.ok('x-proxy-error' in result, 'result has x-proxy-error')
    assert.ok(
      result['x-proxy-error'] && typeof result['x-proxy-error'] === 'object',
      'result has x-proxy-error object'
    )
    assert.ok(
      'status' in result['x-proxy-error'],
      'result has x-proxy-error.status'
    )
    assert.equal(
      result['x-proxy-error'].status,
      stubbedUpstreamResponse.status,
      `result['x-proxy-error'] has status=${stubbedUpstreamResponse.status}`
    )
    assert.ok(
      'statusText' in result['x-proxy-error'],
      'result has x-proxy-error.statusText'
    )
    assert.equal(
      result['x-proxy-error'].statusText,
      stubbedUpstreamResponse.statusText,
      `result['x-proxy-error'] has statusText=${stubbedUpstreamResponse.statusText}`
    )
    assert.ok('url' in result['x-proxy-error'], 'result has x-proxy-error.url')
    assert.equal(
      result['x-proxy-error'].url,
      upstreamUrl,
      `result['x-proxy-error'] has url=${upstreamUrl}`
    )
  })
})
