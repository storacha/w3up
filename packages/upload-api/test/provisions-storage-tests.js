import * as Types from './types.js'
import assert from 'node:assert'
import * as principal from '@ucanto/principal'
import { Provider } from '@web3-storage/capabilities'

/**
 * @param {(c?: unknown) => Promise<Types.ProvisionsStorage>} createVariant - create a new test context
 * @param {(name: string, test: () => Promise<unknown>) => void} test - name a test
 */
export function testVariant(createVariant, test) {
  /**
  */
  test('should persist provisions', async (/**@type {unknown} */ context) => {
    const storage = await createVariant(context)
    const spaceA = await principal.ed25519.generate()
    const issuerKey = await principal.ed25519.generate()
    const issuer = issuerKey.withDID('did:mailto:example.com:foo')
    const invocation = await Provider.add
      .invoke({
        issuer,
        audience: issuer,
        with: issuer.did(),
        nb: {
          consumer: spaceA.did(),
          provider: 'did:web:web3.storage:providers:w3up-alpha',
        },
      })
      .delegate()
    /** @type {Types.Provision} */
    const provision = {
      cause: invocation,
      consumer: spaceA.did(),
      provider: 'did:web:web3.storage:providers:w3up-alpha',
      customer: issuer.did(),
    }

    assert.deepEqual(await storage.count(), BigInt(0))

    const result = await storage.put(provision)
    assert(!result.error, 'adding a provision failed')
    assert.deepEqual(await storage.count(), BigInt(1))

    const spaceHasStorageProvider = await storage.hasStorageProvider(
      spaceA.did()
    )
    assert.deepEqual(spaceHasStorageProvider?.ok, true)

    // ensure no error if we try to store same provision twice
    const dupeResult = await storage.put(provision)
    assert(!dupeResult.error, 'putting the same provision twice did not succeed')
    assert.deepEqual(await storage.count(), BigInt(1))

    const modifiedProvision = {
      ...provision,
      provider: /** @type {import('@ucanto/interface').DID<'web'>} */ (
        'did:provider:foo'
      ),
    }

    // ensure error if we try to store a provision for a consumer that already has a provider
    const modifiedResult = await storage.put(modifiedProvision)
    assert(modifiedResult.error, 'provisioning for a consumer who already has a provider succeeded and should not have!')
    assert.deepEqual(await storage.count(), BigInt(1))
  })

}
