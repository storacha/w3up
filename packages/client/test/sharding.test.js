import assert from 'assert'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream } from '../src/sharding.js'

/**
 * @param {number} size
 */
function randomBlob (size) {
  const parts = []
  while (size) {
    const bytes = crypto.getRandomValues(new Uint8Array(Math.min(size, 65536)))
    parts.push(bytes)
    size -= bytes.length
  }
  return new Blob(parts)
}

describe('sharding', () => {
  it('creates shards from blocks', async () => {
    const file = randomBlob(1024 * 1024)
    const shardSize = 512 * 1024

    /** @type {import('../src/types').CARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ shardSize }))
      .pipeTo(new WritableStream({ write: s => { shards.push(s) } }))

    assert(shards.length > 1)

    for (const car of shards) {
      // add 100 bytes leeway to the chunk size for encoded CAR data
      assert(car.size <= shardSize + 100)
    }
  })
})
