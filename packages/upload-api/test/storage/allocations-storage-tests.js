import * as API from '../../src/types.js'

import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import { equals } from 'uint8arrays'

import {
  RecordKeyConflictName,
  RecordNotFoundErrorName,
} from '../../src/errors.js'
import { alice, bob, registerSpace } from '../util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should store allocations': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const allocationsStorage = context.allocationsStorage

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
    const cause = (await blobAdd.delegate()).link()
    const allocationInsert = await allocationsStorage.insert({
      space: spaceDid,
      blob: {
        digest,
        size,
      },
      cause,
    })

    assert.ok(allocationInsert.ok)
    assert.ok(allocationInsert.ok?.blob)
  },
  'should store same allocation once': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const allocationsStorage = context.allocationsStorage

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
    const cause = (await blobAdd.delegate()).link()
    const allocationInsert0 = await allocationsStorage.insert({
      space: spaceDid,
      blob: {
        digest,
        size,
      },
      cause,
    })
    assert.ok(allocationInsert0.ok)

    const allocationInsert1 = await allocationsStorage.insert({
      space: spaceDid,
      blob: {
        digest,
        size,
      },
      cause,
    })
    assert.ok(allocationInsert1.error)
    assert.equal(allocationInsert1.error?.name, RecordKeyConflictName)
  },
  'should get allocations only when available': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const allocationsStorage = context.allocationsStorage

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    const allocationGet0 = await allocationsStorage.get(spaceDid, digest)
    assert.ok(allocationGet0.error)
    assert.equal(allocationGet0.error?.name, RecordNotFoundErrorName)

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
    const cause = (await blobAdd.delegate()).link()
    const allocationInsert = await allocationsStorage.insert({
      space: spaceDid,
      blob: {
        digest,
        size,
      },
      cause,
    })

    assert.ok(allocationInsert.ok)
    assert.ok(allocationInsert.ok?.blob)

    const allocationGet1 = await allocationsStorage.get(spaceDid, digest)
    assert.ok(allocationGet1.ok)
    assert.ok(allocationGet1.ok?.blob)
    assert.equal(allocationGet1.ok?.blob.size, size)
    assert.ok(
      equals(digest, allocationGet1.ok?.blob.digest || new Uint8Array())
    )
    assert.ok(allocationGet1.ok?.cause)
  },
  'should verify allocations exist': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const allocationsStorage = context.allocationsStorage

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    const allocationExist0 = await allocationsStorage.exists(spaceDid, digest)
    assert.ok(!allocationExist0.error)
    assert.ok(!allocationExist0.ok)

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
    const cause = (await blobAdd.delegate()).link()
    const allocationInsert = await allocationsStorage.insert({
      space: spaceDid,
      blob: {
        digest,
        size,
      },
      cause,
    })

    assert.ok(allocationInsert.ok)
    assert.ok(allocationInsert.ok?.blob)

    const allocationExist1 = await allocationsStorage.exists(spaceDid, digest)
    assert.ok(allocationExist1.ok)
    assert.ok(!allocationExist1.error)
  },
  'should list all allocations in a space': async (assert, context) => {
    const { proof: aliceProof, spaceDid: aliceSpaceDid } = await registerSpace(
      alice,
      context
    )
    const { proof: bobProof, spaceDid: bobSpaceDid } = await registerSpace(
      bob,
      context
    )
    const allocationsStorage = context.allocationsStorage

    // Data for alice
    const data0 = new Uint8Array([11, 22, 34, 44, 55])
    const multihash0 = await sha256.digest(data0)
    const digest0 = multihash0.bytes
    const size0 = data0.byteLength
    const blob0 = {
      digest: digest0,
      size: size0,
    }
    // Data for bob
    const data1 = new Uint8Array([66, 77, 88, 99, 0])
    const multihash1 = await sha256.digest(data1)
    const digest1 = multihash1.bytes
    const size1 = data1.byteLength
    const blob1 = {
      digest: digest1,
      size: size1,
    }

    // Get alice empty allocations
    const allocationsAllice0 = await allocationsStorage.list(aliceSpaceDid)
    assert.ok(allocationsAllice0.ok)
    assert.deepEqual(allocationsAllice0.ok?.results, [])
    assert.equal(allocationsAllice0.ok?.size, 0)

    // invoke `blob/add` with alice
    const aliceBlobAdd0 = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: aliceSpaceDid,
      nb: {
        blob: blob0,
      },
      proofs: [aliceProof],
    })
    const aliceInvocation = (await aliceBlobAdd0.delegate()).link()

    // Add alice allocations
    const aliceAllocationInsert0 = await allocationsStorage.insert({
      space: aliceSpaceDid,
      blob: blob0,
      cause: aliceInvocation,
    })
    assert.ok(aliceAllocationInsert0.ok)

    // invoke `blob/add` with bob
    const bobBlobAdd = BlobCapabilities.add.invoke({
      issuer: bob,
      audience: context.id,
      with: bobSpaceDid,
      nb: {
        blob: blob1,
      },
      proofs: [bobProof],
    })
    const cause = (await bobBlobAdd.delegate()).link()

    // Add bob allocations
    const bobAllocationInsert = await allocationsStorage.insert({
      space: bobSpaceDid,
      blob: blob1,
      cause,
    })
    assert.ok(bobAllocationInsert.ok)

    const allocationsAllice1 = await allocationsStorage.list(aliceSpaceDid)
    assert.ok(allocationsAllice1.ok)
    assert.equal(allocationsAllice1.ok?.size, 1)
    assert.equal(allocationsAllice1.ok?.results.length, 1)
    assert.ok(
      equals(
        blob0.digest,
        allocationsAllice1.ok?.results[0].blob.digest || new Uint8Array()
      )
    )

    // Add bob's data on alice alloctions
    const aliceBlobAdd01 = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: aliceSpaceDid,
      nb: {
        blob: blob1,
      },
      proofs: [aliceProof],
    })
    const aliceInvocation1 = (await aliceBlobAdd01.delegate()).link()

    // Add alice allocations
    const aliceAllocationInsert1 = await allocationsStorage.insert({
      space: aliceSpaceDid,
      blob: blob1,
      cause: aliceInvocation1,
    })
    assert.ok(aliceAllocationInsert1.ok)

    const allocationsAllice2 = await allocationsStorage.list(aliceSpaceDid)
    assert.ok(allocationsAllice2.ok)
    assert.equal(allocationsAllice2.ok?.size, 2)
    assert.equal(allocationsAllice2.ok?.results.length, 2)
    assert.ok(
      allocationsAllice2.ok?.results.find((res) =>
        equals(res.blob.digest, blob0.digest)
      )
    )
    assert.ok(
      allocationsAllice2.ok?.results.find((res) =>
        equals(res.blob.digest, blob1.digest)
      )
    )
  },
}
