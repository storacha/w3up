import * as API from '../../src/types.js'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'multiformats/bytes'
import { alice, bob, randomCID, registerSpace } from '../util.js'
import { EntryExists, EntryNotFound } from '../../src/blob.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should register a blob': async (assert, context) => {
    const { spaceDid: space } = await registerSpace(alice, context)
    const { registry } = context
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)
    const blob = { digest: digest, size: data.length }
    const cause = await randomCID()
    const registration = await registry.register({ space, blob, cause })
    assert.ok(registration.ok)
  },
  'should register same blob in the same space once': async (
    assert,
    context
  ) => {
    const { spaceDid: space } = await registerSpace(alice, context)
    const { registry } = context
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)
    const blob = { digest: digest, size: data.length }
    const cause = await randomCID()
    const registration0 = await registry.register({ space, blob, cause })
    assert.ok(registration0.ok)
    const registration1 = await registry.register({ space, blob, cause })
    assert.ok(registration1.error)
    assert.equal(registration1.error?.name, EntryExists.name)
  },
  'should get entry only when available': async (assert, context) => {
    const { spaceDid: space } = await registerSpace(alice, context)
    const { registry } = context

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)

    const find0 = await registry.find(space, digest)
    assert.ok(find0.error)
    assert.equal(find0.error?.name, EntryNotFound.name)

    const blob = { digest: digest, size: data.length }
    const cause = await randomCID()
    const registration = await registry.register({ space, blob, cause })
    assert.ok(registration.ok)

    const find1 = await registry.find(space, digest)
    assert.ok(find1.ok)
    assert.ok(find1.ok?.blob)
    assert.equal(find1.ok?.blob.size, data.length)
    assert.ok(
      equals(digest.bytes, find1.ok?.blob.digest.bytes || new Uint8Array())
    )
    assert.equal(find1.ok?.cause.toString(), cause.toString())
  },
  'should list all blobs in a space': async (assert, context) => {
    const { spaceDid: aliceSpace } = await registerSpace(alice, context)
    const { spaceDid: bobSpace } = await registerSpace(bob, context)
    const { registry } = context

    // Data for alice
    const data0 = new Uint8Array([11, 22, 34, 44, 55])
    const digest0 = await sha256.digest(data0)
    const blob0 = { digest: digest0, size: data0.length }
    const cause0 = await randomCID()
    // Data for bob
    const data1 = new Uint8Array([66, 77, 88, 99, 0])
    const digest1 = await sha256.digest(data1)
    const blob1 = { digest: digest1, size: data1.length }
    const cause1 = await randomCID()

    // Get alice empty entries
    const entriesAlice0 = await registry.entries(aliceSpace)
    assert.ok(entriesAlice0.ok)
    assert.deepEqual(entriesAlice0.ok?.results, [])
    assert.equal(entriesAlice0.ok?.size, 0)

    // Add alice entries
    const aliceReg0 = await registry.register({
      space: aliceSpace,
      blob: blob0,
      cause: cause0,
    })
    assert.ok(aliceReg0.ok)

    // Add bob allocations
    const bobReg = await registry.register({
      space: bobSpace,
      blob: blob1,
      cause: cause1,
    })
    assert.ok(bobReg.ok)

    const entriesAlice1 = await registry.entries(aliceSpace)
    assert.ok(entriesAlice1.ok)
    assert.equal(entriesAlice1.ok?.size, 1)
    assert.equal(entriesAlice1.ok?.results.length, 1)
    assert.ok(
      equals(
        blob0.digest.bytes,
        entriesAlice1.ok?.results[0].blob.digest.bytes || new Uint8Array()
      )
    )

    // Add bobs data to alice's space
    const cause2 = await randomCID()
    const aliceReg1 = await registry.register({
      space: aliceSpace,
      blob: blob1,
      cause: cause2,
    })
    assert.ok(aliceReg1.ok)

    const entriesAlice2 = await registry.entries(aliceSpace)
    assert.ok(entriesAlice2.ok)
    assert.equal(entriesAlice2.ok?.size, 2)
    assert.equal(entriesAlice2.ok?.results.length, 2)
    assert.ok(
      entriesAlice2.ok?.results.some((res) =>
        equals(res.blob.digest.bytes, blob0.digest.bytes)
      )
    )
    assert.ok(
      entriesAlice2.ok?.results.some((res) =>
        equals(res.blob.digest.bytes, blob1.digest.bytes)
      )
    )
  },
  'should fail to deregister non existent blob': async (assert, context) => {
    const { spaceDid: space } = await registerSpace(alice, context)
    const { registry } = context
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)
    const cause = await randomCID()
    const dereg = await registry.deregister({ space, digest, cause })
    assert.ok(dereg.error)
    assert.equal(dereg.error?.name, EntryNotFound.name)
  },
  'should deregister a blob': async (assert, context) => {
    const { spaceDid: space } = await registerSpace(alice, context)
    const { registry } = context
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)
    const blob = { digest: digest, size: data.length }
    const cause = await randomCID()

    const reg = await registry.register({ space, blob, cause })
    assert.ok(reg.ok)

    const find0 = await registry.find(space, digest)
    assert.ok(find0.ok)

    const deregCause = await randomCID()
    const dereg = await registry.deregister({
      space,
      digest,
      cause: deregCause,
    })
    assert.ok(dereg.ok)

    const find1 = await registry.find(space, digest)
    assert.ok(find1.error)
    assert.equal(find1.error?.name, EntryNotFound.name)
  },
}
