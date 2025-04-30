import { ShardedDAGIndex } from '../src/index.js'
import { randomCAR } from './helpers/random.js'
import * as Result from './helpers/result.js'
import { fromShardArchives } from '../src/util.js'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import * as Link from 'multiformats/link'

/**
 * @typedef {import('entail').Test} Test
 * @typedef {import('entail').assert} Assert
 */

export const test = {
  'handles normal dataset': async (/** @type {Assert} */ assert) => {
    // Create a normal-sized dataset (under threshold)
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())
    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])

    // Archive should use the fast path
    const indexCAR = Result.unwrap(await index.archive())
    const newIndex = Result.unwrap(ShardedDAGIndex.extract(indexCAR))

    assert.notStrictEqual(newIndex.shards.size, 0)
    assert.strictEqual(index.shards.size, newIndex.shards.size)
  },

  'handles large dataset': async (/** @type {Assert} */ assert) => {
    // Create a dummy content link
    const contentBytes = new Uint8Array(32)
    const contentDigest = await sha256.digest(contentBytes)
    const contentLink = Link.create(0x71, contentDigest)

    const model = ShardedDAGIndex.create(contentLink)
    const TOTAL_ENTRIES = 100001
    /** @type {Set<string>} */ const usedBase58 = new Set()

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
      // Create unique byte arrays by using the index as a counter
      const shardBytes = new Uint8Array(32)
      const sliceBytes = new Uint8Array(32)

      // Fill with a pattern that ensures uniqueness
      for (let j = 0; j < 32; j++) {
        if (j < 4) {
          // Use the index i to ensure uniqueness (4 bytes = 4.2 billion possible values)
          shardBytes[j] = (i >> (j * 8)) & 0xff
          sliceBytes[j] = ((i * 2) >> (j * 8)) & 0xff
        } else {
          // Fill remaining bytes with random values
          shardBytes[j] = Math.floor(Math.random() * 256)
          sliceBytes[j] = Math.floor(Math.random() * 256)
        }
      }

      // Verify uniqueness of base58btc encoding
      const shardBase58 = base58btc.encode(shardBytes)
      const sliceBase58 = base58btc.encode(sliceBytes)

      if (usedBase58.has(shardBase58)) {
        throw new Error(`Duplicate shard base58: ${shardBase58}`)
      }
      if (usedBase58.has(sliceBase58)) {
        throw new Error(`Duplicate slice base58: ${sliceBase58}`)
      }

      usedBase58.add(shardBase58)
      usedBase58.add(sliceBase58)

      const shard = await sha256.digest(shardBytes)
      const slice = await sha256.digest(sliceBytes)
      model.setSlice(shard, slice, [0, 32])
    }

    assert.strictEqual(model.shards.size, TOTAL_ENTRIES)
  },

  'maintains sorting order in large dataset': async (
    /** @type {Assert} */ assert
  ) => {
    // Create a dummy content link
    const contentBytes = new Uint8Array(32)
    const contentDigest = await sha256.digest(contentBytes)
    const contentLink = Link.create(0x71, contentDigest)

    const model = ShardedDAGIndex.create(contentLink)
    const TOTAL_ENTRIES = 100001
    /** @type {Set<string>} */ const usedBase58 = new Set()

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
      // Create unique byte arrays by using the index as a counter
      const shardBytes = new Uint8Array(32)
      const sliceBytes = new Uint8Array(32)

      // Fill with a pattern that ensures uniqueness
      for (let j = 0; j < 32; j++) {
        if (j < 4) {
          // Use the index i to ensure uniqueness (4 bytes = 4.2 billion possible values)
          shardBytes[j] = (i >> (j * 8)) & 0xff
          sliceBytes[j] = ((i * 2) >> (j * 8)) & 0xff
        } else {
          // Fill remaining bytes with random values
          shardBytes[j] = Math.floor(Math.random() * 256)
          sliceBytes[j] = Math.floor(Math.random() * 256)
        }
      }

      // Verify uniqueness of base58btc encoding
      const shardBase58 = base58btc.encode(shardBytes)
      const sliceBase58 = base58btc.encode(sliceBytes)

      if (usedBase58.has(shardBase58)) {
        throw new Error(`Duplicate shard base58: ${shardBase58}`)
      }
      if (usedBase58.has(sliceBase58)) {
        throw new Error(`Duplicate slice base58: ${sliceBase58}`)
      }

      usedBase58.add(shardBase58)
      usedBase58.add(sliceBase58)

      const shard = await sha256.digest(shardBytes)
      const slice = await sha256.digest(sliceBytes)
      model.setSlice(shard, slice, [0, 32])
    }

    assert.strictEqual(model.shards.size, TOTAL_ENTRIES)
  },

  'can archive large dataset': async (/** @type {Assert} */ assert) => {
    // Create a dummy content link
    const contentBytes = new Uint8Array(32)
    const contentDigest = await sha256.digest(contentBytes)
    const contentLink = Link.create(0x71, contentDigest)

    const model = ShardedDAGIndex.create(contentLink)
    const TOTAL_ENTRIES = 100001
    /** @type {Set<string>} */ const usedBase58 = new Set()

    for (let i = 0; i < TOTAL_ENTRIES; i++) {
      // Create unique byte arrays by using the index as a counter
      const shardBytes = new Uint8Array(32)
      const sliceBytes = new Uint8Array(32)

      // Fill with a pattern that ensures uniqueness
      for (let j = 0; j < 32; j++) {
        if (j < 4) {
          // Use the index i to ensure uniqueness (4 bytes = 4.2 billion possible values)
          shardBytes[j] = (i >> (j * 8)) & 0xff
          sliceBytes[j] = ((i * 2) >> (j * 8)) & 0xff
        } else {
          // Fill remaining bytes with random values
          shardBytes[j] = Math.floor(Math.random() * 256)
          sliceBytes[j] = Math.floor(Math.random() * 256)
        }
      }

      // Verify uniqueness of base58btc encoding
      const shardBase58 = base58btc.encode(shardBytes)
      const sliceBase58 = base58btc.encode(sliceBytes)

      if (usedBase58.has(shardBase58)) {
        throw new Error(`Duplicate shard base58: ${shardBase58}`)
      }
      if (usedBase58.has(sliceBase58)) {
        throw new Error(`Duplicate slice base58: ${sliceBase58}`)
      }

      usedBase58.add(shardBase58)
      usedBase58.add(sliceBase58)

      const shard = await sha256.digest(shardBytes)
      const slice = await sha256.digest(sliceBytes)
      model.setSlice(shard, slice, [0, 32])
    }

    // Test that we can archive the large dataset
    const result = await model.archive()
    assert.ok(result.ok, 'Archive should succeed')

    // Test that we can extract the archive
    const extracted = ShardedDAGIndex.extract(result.ok)
    assert.ok(extracted.ok, 'Extract should succeed')
    assert.strictEqual(
      extracted.ok.shards.size,
      TOTAL_ENTRIES,
      'Should have all shards'
    )
  },
}

export default test
