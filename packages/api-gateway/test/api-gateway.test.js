import assert from 'node:assert'
import { ApiGatewayWorker } from '../src/index.js'
import 'urlpattern-polyfill'
import { createMiniflareTester, createWorkerTester } from './helpers.js'

/**
 * @param {import('./helpers.js').FetchTestNamer} test
 */
function testApiGateway(test) {
  test('GET /: 200', async ({ url, fetch }) => {
    await testServesUrl(fetch, url)
  })
  test('has a did doc', async ({ url, fetch }) => {
    await testServesDidWebDocument(fetch, url)
  })
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

describe('ApiGatewayWorker in miniflare', () => {
  testApiGateway((testName, test) => {
    it(testName, () => createMiniflareTester()(test))
  })
})

describe('ApiGatewayWorker', () => {
  testApiGateway(function testUsingWorker(testName, test) {
    it(testName, () => createWorkerTester(new ApiGatewayWorker())(test))
  })
})
