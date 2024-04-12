import * as API from '../../src/types.js'

import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'

import { RecordNotFoundErrorName } from '../../src/errors.js'
import { alice, registerSpace } from '../util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should be able to store receipts, even the same': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const receiptsStorage = context.receiptsStorage
    const connection = context.connection

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

    const putTask0 = await receiptsStorage.put(receipt)
    assert.ok(putTask0.ok)

    // same put
    const putTask1 = await receiptsStorage.put(receipt)
    assert.ok(putTask1.ok)
  },
  'should be able to get stored receipts, or check if they exist': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const receiptsStorage = context.receiptsStorage
    const connection = context.connection

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

    // Get before put
    const getTask0 = await receiptsStorage.get(receipt.ran.link())
    assert.ok(getTask0.error)
    assert.equal(getTask0.error?.name, RecordNotFoundErrorName)

    // Has before put
    const hasTask0 = await receiptsStorage.has(receipt.ran.link())
    assert.ok(!hasTask0.error)
    assert.ok(!hasTask0.ok)

    // Put task
    const putTask = await receiptsStorage.put(receipt)
    assert.ok(putTask.ok)

    // Get after put
    const getTask1 = await receiptsStorage.get(receipt.ran.link())
    assert.ok(getTask1.ok)
    assert.ok(getTask1.ok?.ran.link().equals(receipt.ran.link()))

    // Has after put
    const hasTask1 = await receiptsStorage.has(receipt.ran.link())
    assert.ok(!hasTask1.error)
    assert.ok(hasTask1.ok)
  },
}
