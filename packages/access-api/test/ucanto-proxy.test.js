import assert from 'assert'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as ed25519 from '@ucanto/principal/ed25519'
import { createProxyHandler } from '../src/ucanto/proxy.js'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'

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
})
