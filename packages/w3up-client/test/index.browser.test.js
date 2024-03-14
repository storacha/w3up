import assert from 'assert'
import { RS256 } from '@ipld/dag-ucan/signature'
import * as W3Up from '@web3-storage/w3up-client'

describe('create', () => {
  it('should create RSA key', async () => {
    const client = await W3Up.open({
      store: W3Up.Store.open({ name: 'w3up-client-test' }),
    })

    const signer = client.agent.signer
    assert.equal(signer.signatureAlgorithm, 'RS256')
    assert.equal(signer.signatureCode, RS256)
  })
})
