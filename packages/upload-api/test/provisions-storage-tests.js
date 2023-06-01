import * as API from '../src/types.js'
import * as Types from './types.js'
import * as principal from '@ucanto/principal'
import { Provider } from '@web3-storage/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'should persist provisions':
    async (assert, context) => {
      const storage = context.provisionsStorage
      const spaceA = await principal.ed25519.generate()
      const issuerKey = await principal.ed25519.generate()
      const issuer = issuerKey.withDID('did:mailto:example.com:foo')
      const provider = 'did:web:web3.storage:providers:w3up-alpha'
      const invocation = await Provider.add
        .invoke({
          issuer,
          audience: issuer,
          with: issuer.did(),
          nb: {
            consumer: spaceA.did(),
            provider,
          },
        })
        .delegate()
      /** @type {Types.Provision} */
      const provision = {
        cause: invocation,
        consumer: spaceA.did(),
        provider,
        customer: issuer.did(),
      }

      assert.deepEqual(await storage.count(), BigInt(0))

      const result = await storage.put(provision)
      assert.ok(!result.error, 'adding a provision failed')
      assert.deepEqual(await storage.count(), BigInt(1))

      const spaceHasStorageProvider = await storage.hasStorageProvider(
        spaceA.did()
      )
      assert.deepEqual(spaceHasStorageProvider?.ok, true)
      // ensure no error if we try to store same provision twice
      const dupeResult = await storage.put(provision)
      assert.ok(!dupeResult.error, 'putting the same provision twice did not succeed')
      assert.deepEqual(await storage.count(), BigInt(1))

      const modifiedProvision = {
        ...provision,
        provider: /** @type {import('@ucanto/interface').DID<'web'>} */ (
          'did:provider:foo'
        ),
      }

      // ensure error if we try to store a provision for a consumer that already has a provider
      const modifiedResult = await storage.put(modifiedProvision)
      assert.ok(modifiedResult.error, 'provisioning for a consumer who already has a provider succeeded and should not have!')
      assert.deepEqual(await storage.count(), BigInt(1))

      // verify that provisions are returned as part of customer record
      const customerResult = await storage.getCustomer(provider, issuer.did())
      assert.ok(!customerResult.error, 'error getting customer record')
      assert.deepEqual(customerResult.ok, { did: issuer.did() })

      const fakeCustomerResult = await storage.getCustomer(provider, 'did:mailto:example.com:travis')
      assert.ok(!fakeCustomerResult.error, 'error getting fake customer record')
      assert.equal(fakeCustomerResult.ok, null)
    }
}
