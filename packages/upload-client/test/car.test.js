import assert from 'assert'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream } from '../src/car.js'
import { randomBytes } from './helpers/random.js'

describe('sharding', () => {
  it('creates shards from blocks', async () => {
    const file = new Blob([randomBytes(1024 * 1024)])
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
