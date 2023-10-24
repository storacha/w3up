import * as API from '../../src/types.js'
import * as Types from '../types.js'
import * as principal from '@ucanto/principal'
import { Provider } from '@web3-storage/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'should persist plans': async (assert, context) => {
    const storage = context.plansStorage

    const account = 'did:mailto:example.com:alice'
    const product = 'did:web:free.web3.storage'
    const setResult = await storage.set(account, product)

    assert.ok(setResult.ok)

    const getResult = await storage.get(account)
    assert.equal(getResult.ok?.product, product)
  },
}
