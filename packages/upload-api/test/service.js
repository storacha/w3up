import * as API from './types.js'
import { alice } from './helpers/utils.js'
import { Space } from '@web3-storage/capabilities'
import { parseLink } from '@ucanto/core'

/**
 * @type {API.Tests}
 */
export const test = {
  'invocation idempotence': async (assert, context) => {
    const info = Space.info.invoke({
      issuer: alice,
      audience: context.id,
      with: alice.did(),
    })

    const receipt = await info.execute(context.connection)
    assert.ok(receipt.out.error, 'space has not been provisioned')

    const provision = await context.provisionsStorage.put({
      consumer: alice.did(),
      customer: 'did:mailto:alice@web.mail',
      provider: /** @type {API.ProviderDID} */ (context.id.did()),
      cause: parseLink('bafkqaaa'),
    })

    assert.ok(provision.ok)

    const newReceipt = await Space.info
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nonce: receipt.link().toString(),
      })
      .execute(context.connection)

    assert.ok(newReceipt.out.ok, 'new call gets a new receipt')

    const oldReceipt = await info.execute(context.connection)
    assert.deepEqual(
      receipt.link(),
      oldReceipt.link(),
      'same receipt was returned'
    )
  },
  // ⚠️ This is not a correct behavior per UCAN invocation specification because
  // expiration does not affect task identifier. However since we don't want our
  // users to worry about nonce, we would need to make sure our client code
  // generates them behind the scenes. In the meantime we have this test to make
  // sure that when spec compliant idempotence is rolled out our clint code is
  // taking care of nonces.
  'invocation is unique every second': async (assert, context) => {
    const task = {
      issuer: alice,
      audience: context.id,
      with: alice.did(),
    }

    const receipt = await Space.info.invoke(task).execute(context.connection)
    const ready = new Promise((done) => setTimeout(done, 1000))
    assert.ok(receipt.out.error, 'space has not been provisioned')

    const provision = await context.provisionsStorage.put({
      consumer: alice.did(),
      customer: 'did:mailto:alice@web.mail',
      provider: /** @type {API.ProviderDID} */ (context.id.did()),
      cause: parseLink('bafkqaaa'),
    })
    assert.ok(provision.ok)

    // If we wait a second new invocation will get different expiry making it
    // different from the previous invocation
    await ready
    const recall = await Space.info.invoke(task).execute(context.connection)
    assert.ok(recall.out.ok, 'space got provisioned')

    assert.ok(recall.link().toString() !== receipt.link().toString())
    assert.ok(recall.ran.link.toString() !== receipt.link().toString())
  },
}
