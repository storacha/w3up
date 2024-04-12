import * as API from '../../src/types.js'

import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'

import { RecordNotFoundErrorName } from '../../src/errors.js'
import { alice, registerSpace } from '../util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should be able to store tasks, even the same': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const tasksStorage = context.tasksStorage

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
    const task = await blobAdd.delegate()

    const putTask0 = await tasksStorage.put(task)
    assert.ok(putTask0.ok)

    // same put
    const putTask1 = await tasksStorage.put(task)
    assert.ok(putTask1.ok)
  },
  'should be able to get stored tasks, or check if they exist': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const tasksStorage = context.tasksStorage

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
    const task = await blobAdd.delegate()

    // Get before put
    const getTask0 = await tasksStorage.get(task.link())
    assert.ok(getTask0.error)
    assert.equal(getTask0.error?.name, RecordNotFoundErrorName)

    // Has before put
    const hasTask0 = await tasksStorage.has(task.link())
    assert.ok(!hasTask0.error)
    assert.ok(!hasTask0.ok)

    // Put task
    const putTask = await tasksStorage.put(task)
    assert.ok(putTask.ok)

    // Get after put
    const getTask1 = await tasksStorage.get(task.link())
    assert.ok(getTask1.ok)
    assert.ok(getTask1.ok?.link().equals(task.link()))

    // Has after put
    const hasTask1 = await tasksStorage.has(task.link())
    assert.ok(!hasTask1.error)
    assert.ok(hasTask1.ok)
  },
}
