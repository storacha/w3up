import assert from 'assert'
import { CID } from 'multiformats'
import { equals } from 'multiformats/bytes'
import { sha256 } from 'multiformats/hashes/sha2'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream } from '../src/sharding.js'
import { randomBlock, randomBytes } from './helpers/random.js'

describe('ShardingStream', () => {
  it('creates shards from blocks', async () => {
    const file = new Blob([await randomBytes(1024 * 1024 * 5)])
    const shardSize = 1024 * 1024 * 2

    /** @type {import('../src/types.js').CARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ shardSize }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert(shards.length > 1)

    for (const car of shards) {
      // add 100 bytes leeway to the chunk size for encoded CAR data
      assert(car.size <= shardSize + 100)
    }
  })

  it('uses passed root CID', async () => {
    const file = new Blob([await randomBytes(32)])

    const rootCID = CID.parse(
      'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
    )
    /** @type {import('../src/types.js').CARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ rootCID }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert.equal(shards.length, 1)
    assert.equal(shards[0].roots[0].toString(), rootCID.toString())
  })

  it('exceeds shard size when block bigger than shard size is encoded', async () => {
    await assert.rejects(
      () =>
        new ReadableStream({
          async pull(controller) {
            const block = await randomBlock(128)
            controller.enqueue(block)
            controller.close()
          },
        })
          .pipeThrough(new ShardingStream({ shardSize: 64 }))
          .pipeTo(new WritableStream()),
      /block will cause CAR to exceed shard size/
    )
  })

  it('creates overflow shard when CAR header with root CID exceeds shard size', async () => {
    const blocks = [
      await randomBlock(128), // encoded block length = 166
      await randomBlock(64), // encoded block length = 102
      await randomBlock(32), // encoded block length = 70
    ]

    /** @type {import('../src/types.js').IndexedCARFile[]} */
    const shards = []
    let i = 0
    await new ReadableStream({
      pull(controller) {
        const block = blocks[i]
        if (!block) return controller.close()
        controller.enqueue(block)
        i++
      },
    })
      // 166 + 102 + 70 + 18 (0 root CAR header) = 356
      // 166 + 102 + 70 + 59 (1 root CAR header) = 397
      // Choose 360 as shard size so when CAR header with a root is added, the
      // 3rd block is moved into a new shard.
      .pipeThrough(new ShardingStream({ shardSize: 360 }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert.equal(shards.length, 2)

    const shard0Bytes = new Uint8Array(await shards[0].arrayBuffer())
    const shard1Bytes = new Uint8Array(await shards[1].arrayBuffer())

    // block 0 and 1 should be in shard 0
    const slice0 = shards[0].slices.get(blocks[0].cid.multihash)
    assert.ok(slice0)
    assert(
      equals(
        blocks[0].bytes,
        shard0Bytes.slice(slice0[0], slice0[0] + slice0[1])
      )
    )

    const slice1 = shards[0].slices.get(blocks[1].cid.multihash)
    assert.ok(slice1)
    assert(
      equals(
        blocks[1].bytes,
        shard0Bytes.slice(slice1[0], slice1[0] + slice1[1])
      )
    )

    // block 2 should be in shard 1
    const slice2 = shards[1].slices.get(blocks[2].cid.multihash)
    assert.ok(slice2)
    assert(
      equals(
        blocks[2].bytes,
        shard1Bytes.slice(slice2[0], slice2[0] + slice2[1])
      )
    )
  })

  it('exceeds shard size when block is encoded with root CID', async () => {
    const blocks = [
      await randomBlock(128), // encoded block length = 166
    ]

    await assert.rejects(() => {
      return (
        new ReadableStream({
          pull(controller) {
            const block = blocks.shift()
            if (!block) return controller.close()
            controller.enqueue(block)
          },
        })
          // shard with no roots = encoded block (166) + CAR header (18) = 184
          // shard with 1 root = encoded block (166) + CAR header (59) = 225
          // i.e. shard size of 183 should allow us 1 shard with no roots and then
          // we'll fail to create a shard with 1 root.
          .pipeThrough(new ShardingStream({ shardSize: 184 }))
          .pipeTo(new WritableStream())
      )
    }, /block will cause CAR to exceed shard size/)
  })

  it('no blocks no shards', async () => {
    let shards = 0
    await new ReadableStream({
      pull: (controller) => {
        controller.close()
      },
    })
      .pipeThrough(new ShardingStream({ shardSize: 206 }))
      .pipeTo(
        new WritableStream({
          write: () => {
            shards++
          },
        })
      )
    assert.equal(shards, 0)
  })

  it('indexes blocks in shards', async () => {
    const file = new Blob([await randomBytes(1024 * 1024 * 10)])
    const shardSize = 1024 * 1024 * 3

    /** @type {import('../src/types.js').IndexedCARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ shardSize }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert(shards.length > 1)

    for (const car of shards) {
      const bytes = new Uint8Array(await car.arrayBuffer())
      for (const [expected, [offset, length]] of car.slices.entries()) {
        const actual = await sha256.digest(bytes.slice(offset, offset + length))
        assert(equals(expected.bytes, actual.bytes))
      }
    }
  })
})
