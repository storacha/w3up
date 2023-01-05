import assert from 'node:assert'
import { ApiGatewayWorker } from '../src/index.js'
import 'urlpattern-polyfill'
import { createMiniflareTester, createWorkerTester } from './helpers.js'
import * as DagUCAN from '@ipld/dag-ucan'
import * as ed25519Principal from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as HTTP from '@ucanto/transport/http'
import * as ucanto from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'

describe('ApiGatewayWorker in miniflare', () => {
  testApiGateway((useFetch) => () => createMiniflareTester()(useFetch))
})

describe('ApiGatewayWorker', () => {
  testApiGateway(
    (useFetch) => () => createWorkerTester(new ApiGatewayWorker())(useFetch)
  )
})

/**
 * @typedef {(testName: string, test: () => void|Promise<void>) => void|Promise<void>} TestFunction
 */

/**
 * @param {import('./helpers.js').FetchTestContextCreator} withFetch
 * @param {TestFunction} test
 */
function testApiGateway(
  withFetch,
  test = (name, fn) => {
    it(name, fn)
  }
) {
  test(
    'GET /: 200',
    withFetch(async ({ url, fetch }) => {
      await testServesUrl(fetch, url)
    })
  )
  test(
    'has a did doc',
    withFetch(async ({ url, fetch }) => {
      await testServesDidWebDocument(fetch, url)
    })
  )
  test(
    'responds to UCAN POST',
    withFetch(async ({ url, fetch }) => {
      const { invocation } = await simpleInvocationScenario({
        can: 'test/success',
        with: 'https://dag.house',
      })
      const request = new Request(
        url,
        await createDagUcanInvocationRequest(invocation)
      )
      const response = await fetch(request)
      assert.equal(
        response.status,
        200,
        'responds to dag-ucan invocation request with 200'
      )
      assert.equal(
        response.headers.get('content-type'),
        'application/cbor',
        'responds with application/cbor'
      )
    })
  )
  test(
    'responds to test/success invocation over ucanto http car/cbor',
    withFetch(async ({ url, fetch }) => {
      const { invocation } = await simpleInvocationScenario({
        can: 'test/success',
        with: 'ipfs:dag.house',
      })
      const connection = Client.connect({
        id: invocation.audience,
        channel: HTTP.open({
          url,
          fetch,
        }),
        encoder: CAR,
        decoder: CBOR,
      })
      const result = await connection.execute(ucanto.invoke(invocation))
      assert.ok(result, 'ucanto invocation returns truthy result')
    })
  )
}

/**
 * @param {(request: Request) => Promise<Response>} fetch
 * @param {URL} url
 */
async function testServesUrl(fetch, url) {
  const request = new Request(url)
  const response = await fetch(request)
  assert.equal(response.status, 200)
}

/**
 * @param {(request: Request) => Promise<Response>} fetch
 * @param {URL} baseUrl
 */
async function testServesDidWebDocument(fetch, baseUrl) {
  const request = new Request(new URL('/.well-known/did.json', baseUrl))
  const response = await fetch(request)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json')
  const didDocument = await response.json()
  assert.equal(
    didDocument.id,
    `did:web:${baseUrl.host}`,
    'did document has id did from request host header'
  )
  assert.equal('@context' in didDocument, true, 'did document has @context')
}

/**
 * create a Request that will invoke a UCAN over HTTP
 *
 * @template {DagUCAN.Capability} C
 * @param {object} invocation
 * @param {DagUCAN.Audience} invocation.audience
 * @param {DagUCAN.Signer<DagUCAN.DID, DagUCAN.SigAlg>} invocation.issuer
 * @param {C} invocation.capability
 * @returns {Promise<RequestInit>}
 */
async function createDagUcanInvocationRequest(invocation) {
  const ucan = await DagUCAN.issue({
    capabilities: [invocation.capability],
    ...invocation,
  })
  /** @type {RequestInit} */
  const request = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${DagUCAN.format(ucan)}`,
    },
  }
  return request
}

/**
 * create objects useful for testing a ucan invocation
 *
 * @param {DagUCAN.Capability} capability - capabilities in invocation
 */
async function simpleInvocationScenario(capability) {
  const issuer = await ed25519Principal.generate()
  const audience = await ed25519Principal.generate()
  const invocation = {
    issuer,
    audience,
    capability,
  }
  return { issuer, audience, invocation }
}
