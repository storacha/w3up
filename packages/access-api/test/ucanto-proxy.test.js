import assert from 'assert'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
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
      codec: CAR.inbound,
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
      codec: CAR.inbound,
      service: {
        test: {
          succeed: createProxyHandler({
            connections: {
              default: Client.connect({
                id: upstreamPrincipal,
                codec: CAR.outbound,
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
      codec: CAR.outbound,
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
    assert.equal(result.out.error, undefined, 'result has no error')
    assert.equal(testSucceedInvocations.length, 1, 'upstream was invoked once')
    assert.deepEqual(
      testSucceedInvocations[0][0].capabilities[0],
      invocationCapability,
      'upstream received same capability as was sent to proxy'
    )
    assert.deepEqual(
      result.out,
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
      codec: CAR.inbound,
      service: {
        test: {
          succeed: createProxyHandler({
            connections: {
              default: Client.connect({
                id: upstreamPrincipal,
                codec: CAR.outbound,
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
      codec: CAR.outbound,
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

    assert.deepEqual(result.out, {
      error: {
        status: 502,
        statusText: 'Bad Gateway',
        'x-proxy-error': {
          name: 'HTTPError',
          status: stubbedUpstreamResponse.status,
          statusText: stubbedUpstreamResponse.statusText,
          url: upstreamUrl.href,
        },
      },
    })
  })
})
