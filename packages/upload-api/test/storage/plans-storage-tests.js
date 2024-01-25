import * as API from '../../src/types.js'

const account = 'did:mailto:example.com:alice'
const billingID = 'stripe:abc123'
const product = 'did:web:free.web3.storage'

/**
 * @type {API.Tests}
 */
export const test = {
  'can initialize a customer': async (assert, context) => {
    const storage = context.plansStorage

    const initializeResult = await storage.initialize(account, billingID, product)

    assert.ok(initializeResult.ok)

    const getResult = await storage.get(account)
    assert.equal(getResult.ok?.product, product)
  },

  'should not allow plans to be updated for uninitialized customers': async (assert, context) => {
    const storage = context.plansStorage

    const setResult = await storage.set(account, product)

    assert.ok(setResult.error)
    assert.equal(setResult.error?.name, 'CustomerNotFound')
  },

  'should allow plans to be updated for initialized customers': async (assert, context) => {
    const storage = context.plansStorage

    const initializeResult = await storage.initialize(account, billingID, product)

    assert.ok(initializeResult.ok)

    const getResult = await storage.get(account)
    assert.equal(getResult.ok?.product, product)

    const newProduct = 'did:web:expensive.web3.storage'

    const setResult = await storage.set(account, newProduct)

    assert.ok(setResult.ok)

    const newGetResult = await storage.get(account)
    assert.equal(newGetResult.ok?.product, newProduct)
  },
}
