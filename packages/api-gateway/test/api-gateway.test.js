import assert from 'node:assert'
import { ApiGatewayWorker } from '../src/index.js'
import 'urlpattern-polyfill'

describe('api-gateway', () => {
  it('GET /: 200', async () => {
    const worker = new ApiGatewayWorker()
    const request = new Request('https://example.com')
    const response = await worker.fetch(request, {})
    assert.equal(response.status, 200)
  })
  it('has a did doc', async () => {
    assert.equal(1, 1)
    const worker = new ApiGatewayWorker()
    const request = new Request('https://example.com/.well-known/did.json')
    const response = await worker.fetch(request, {})
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json')
    const didDocument = await response.json()
    assert.equal(
      didDocument.id,
      `did:web:example.com`,
      'did document has id did from request host header'
    )
    assert.equal('@context' in didDocument, true, 'did document has @context')
  })
})
