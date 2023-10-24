import * as API from '../../src/types.js'

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
