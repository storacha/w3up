import assert from 'assert'
import { RS256 } from '@ipld/dag-ucan/signature'
import { create } from '../src/index.js'

describe('create', () => {
  it('should create RSA key', async () => {
    const client = await create()
    const signer = client.agent()
    assert.equal(signer.signatureAlgorithm, 'RS256')
    assert.equal(signer.signatureCode, RS256)
  })
})
