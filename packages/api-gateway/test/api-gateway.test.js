import assert from 'node:assert'
import { ApiGatewayWorker } from '../src/index.js'
import 'urlpattern-polyfill'
import { createMiniflareTester, createWorkerTester } from './helpers.js'
// eslint-disable-next-line no-unused-vars
import * as DagUCAN from '@ipld/dag-ucan'
import * as ed25519Principal from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as HTTP from '@ucanto/transport/http'
import * as ucanto from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Voucher from '@web3-storage/capabilities/voucher'
import * as DID from '@ipld/dag-ucan/did'
import { Space, Store } from '@web3-storage/capabilities'

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
    'responds to test/success invocation over ucanto http car/cbor',
    withFetch(async ({ url, fetch }) => {
      const audience = DID.parse('did:web:web3.storage')
      const capability = /** @type {const} */ ({
        can: 'test/success',
        with: 'https://dag.house',
      })
      const { invocation } = await simpleInvocationScenario({
        audience,
        capability,
      })
      const connection = createHttpConnection({
        url,
        audience: invocation.audience,
        fetch,
      })
      const result = await connection.execute(ucanto.invoke(invocation))
      assert.ok(result, 'ucanto invocation returns truthy result')
    })
  )
  test(
    'responds to @web3-storage/capabilities invocations over ucanto http car/cbor',
    withFetch(async ({ url, fetch }) => {
      const invoker = await ed25519Principal.generate()
      const audience = DID.parse('did:web:web3.storage')
      const connection = createHttpConnection({ url, audience, fetch })
      /**
       * @typedef CanAssertError
       * @property {(error: unknown) => void} [error] - assert on any errors
       */
      /**
       * @typedef {object} HasCapability
       * @property {DagUCAN.Capability} capability
       */
      /**
       * @typedef {object} HasInvocation
       * @property {import('@ucanto/interface').IssuedInvocationView} invocation
       */
      /**
       * @typedef {(HasCapability|HasInvocation)&CanAssertError} TestCase
       */
      /** @type {Array<TestCase>} */
      const casesForAccessApi = [
        {
          capability: Space.info.create({
            with: invoker.did(),
          }),
          error: (result) => {
            assert(result, 'result is truthy')
            assert(
              typeof result === 'object' &&
                'stack' in result &&
                typeof result.stack === 'string',
              'result error has stack string'
            )
            assert(result.stack.includes('Space not found'))
          },
        },
        {
          capability: Voucher.claim.create({
            with: await ed25519Principal.generate().then((p) => p.did()),
            nb: {
              product: 'product:free',
              identity: 'mailto:email@dag.house',
            },
          }),
          // this capability will be rejected because voucher/claim must be issued by the upstream,
          // but this test has it self-issued
          error: (result) => {
            assert(
              typeof result === 'object' && result && 'name' in result,
              'result has name'
            )
            assert.equal(result.name, 'Unauthorized')
            assert('stack' in result && typeof result.stack === 'string')
            assert(
              result.stack.includes(
                `Capability can not be (self) issued by 'did:key`
              )
            )
          },
        },
      ]
      const space = await ed25519Principal.generate()
      /** @type {TestCase[]} */
      const casesForUploadApi = [
        {
          invocation: Store.list.invoke({
            issuer: invoker,
            audience,
            proofs: [
              // space delegates all to invoker
              await ucanto.Delegation.delegate({
                issuer: space,
                audience: invoker,
                capabilities: [{ can: '*', with: space.did() }],
              }),
            ],
            with: space.did(),
            nb: {},
          }),
        },
      ]
      /** @type {TestCase[]} */
      const cases = [
        { capability: { can: 'test/success', with: 'ipfs:dag.house' } },
        ...casesForAccessApi,
        ...casesForUploadApi,
      ]
      for (const { error, ...testCase } of cases) {
        const invocation = await (async () => {
          if ('invocation' in testCase) {
            return testCase.invocation
          }
          const scenario = await simpleInvocationScenario({
            issuer: invoker,
            audience,
            capability: testCase.capability,
          })
          return ucanto.invoke(scenario.invocation)
        })()
        const results = await connection.execute(invocation)
        assert.ok(results, 'ucanto invocation returns truthy results')
        assert.ok(results.length === 1, 'results is of length 1')
        const result = results[0]
        if (error) {
          assert.equal(result.error, true, 'error in result')
          error(result)
        } else {
          try {
            assert.equal('error' in result, false, 'no error in result')
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('error result', result)
            throw error
          }
        }
      }
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
 * @typedef {object} Invocation
 * @property {DagUCAN.Audience} audience
 * @property {ed25519Principal.Signer.Signer} issuer
 * @property {DagUCAN.Capability} capability
 */

/**
 * create objects useful for testing a ucan invocation
 *
 * @param {object} options
 * @param {ed25519Principal.Signer.Signer} [options.issuer]
 * @param {DagUCAN.Audience} [options.audience]
 * @param {DagUCAN.Capability} options.capability - capabilities in invocation
 */
async function simpleInvocationScenario(options) {
  const issuer = options.issuer || (await ed25519Principal.generate())
  const audience = options.audience || (await ed25519Principal.generate())
  /** @type {Invocation} */
  const invocation = {
    issuer,
    audience,
    capability: options.capability,
  }
  return { issuer, audience, invocation }
}

/**
 * @param {object} options
 * @param {URL} options.url
 * @param {import('@ipld/dag-ucan/.').Audience} options.audience
 * @param {typeof globalThis.fetch} options.fetch
 */
function createHttpConnection({ url, audience, fetch }) {
  const connection = Client.connect({
    id: audience,
    channel: HTTP.open({
      url,
      fetch,
    }),
    encoder: CAR,
    decoder: CBOR,
  })
  return connection
}
