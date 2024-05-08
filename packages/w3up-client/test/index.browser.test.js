import * as Test from './test.js'
import { RS256 } from '@ipld/dag-ucan/signature'
import { create } from '../src/index.js'

/**
 * @type {Test.Suite}
 */
export const testRSAKey = {
  'should create RSA key': async (assert) => {
    const client = await create()
    const signer = client.agent.issuer
    assert.equal(signer.signatureAlgorithm, 'RS256')
    assert.equal(signer.signatureCode, RS256)
  },
}

Test.test({ RSA: testRSAKey })
