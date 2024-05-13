import * as API from '../../src/types.js'

import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import { Console } from '@web3-storage/capabilities'

import { alice, registerSpace } from '../util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'receipt should be stored for executed task': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const { agentStore, connection } = context

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // invoke `blob/add`
    const blobAdd = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    // Invoke `blob/add`
    const receipt = await blobAdd.execute(connection)
    if (!receipt.out.ok) {
      throw new Error('invocation failed', { cause: receipt })
    }

    const read = await agentStore.receipts.get(receipt.ran.link())
    assert.ok(read.ok)

    assert.deepEqual(read.ok?.link(), receipt.link())
  },
  'invoked task should be stored': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const { agentStore, connection } = context

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // invoke `blob/add`
    const blobAdd = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    // Invoke `blob/add`
    const receipt = await blobAdd.execute(connection)
    if (!receipt.out.ok) {
      throw new Error('invocation failed', { cause: receipt })
    }

    const result = await agentStore.invocations.get(receipt.ran.link())
    assert.ok(result.ok)

    assert.deepEqual(result.ok, /** @type {API.Invocation} */ (receipt.ran))
  },

  'could receive message with an existing invocation': async (
    assert,
    context
  ) => {
    const hi = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'hi',
        },
      })
      .delegate()

    const bye = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          value: 'bye',
        },
      })
      .delegate()

    const [hiReceipt] = await context.connection.execute(hi)
    assert.ok(hiReceipt.out.ok)

    const storedHi = await context.agentStore.invocations.get(hi.link())
    assert.deepEqual(storedHi.ok?.link(), hi.link())

    const storedHiReceipt = await context.agentStore.receipts.get(hi.link())
    assert.equal(
      storedHiReceipt.ok?.ran.link().toString(),
      hi.link().toString()
    )

    const [byeReceipt, hiReceipt2] = await context.connection.execute(bye, hi)

    assert.deepEqual(hiReceipt2.ran.link(), hi.link())
    assert.ok(byeReceipt.out.ok)

    const storedBye = await context.agentStore.invocations.get(bye.link())
    assert.deepEqual(storedBye.ok?.link(), bye.link())

    const storedByeReceipt = await context.agentStore.receipts.get(bye.link())
    assert.equal(
      storedByeReceipt.ok?.ran.link().toString(),
      bye.link().toString()
    )

    const restoredBye = await context.agentStore.receipts.get(bye.link())
    assert.equal(restoredBye.ok?.ran.link().toString(), bye.link().toString())
  },
}
