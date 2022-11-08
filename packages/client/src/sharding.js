import { CarWriter } from '@ipld/car'
import { collect } from './utils.js'

// most thing are < 30MB
const SHARD_SIZE = 1024 * 1024 * 30

/**
 * Shard a set of blocks into a set of CAR files. The last block is assumed to
 * be the DAG root and becomes the CAR root CID for the last CAR output.
 * 
 * @extends {TransformStream<import('@ipld/unixfs').Block, import('./types').CARFile>}
 */
export class ShardingStream extends TransformStream {
  /**
   * @param {Object} [options]
   * @param {number} [options.shardSize] The target shard size. Actual size of
   * CAR output may be bigger due to CAR header and block encoding data.
   */
  constructor (options = {}) {
    const shardSize = options.shardSize ?? SHARD_SIZE
    /** @type {import('@ipld/unixfs').Block[]} */
    let shard = []
    /** @type {import('@ipld/unixfs').Block[] | null} */
    let readyShard = null
    let size = 0

    super({
      async transform (block, controller) {
        if (readyShard != null) {
          controller.enqueue(await encodeCAR(readyShard))
          readyShard = null
        }
        if (size + block.bytes.length > shardSize) {
          readyShard = shard
          shard = []
          size = 0
        }
        shard.push(block)
        size += block.bytes.length
      },

      async flush (controller) {
        if (readyShard != null) {
          controller.enqueue(await encodeCAR(readyShard))
        }

        const rootBlock = shard.at(-1)
        if (rootBlock != null) {
          controller.enqueue(await encodeCAR(shard, rootBlock.cid))
        }
      }
    })
  }
}

/**
 * 
 * @param {Iterable<import('@ipld/unixfs').Block>|AsyncIterable<import('@ipld/unixfs').Block>} blocks 
 * @param {import('multiformats').Link<unknown, number, number, import('multiformats').Version>} [root]
 * @returns {Promise<import('./types').CARFile>}
 */
export async function encodeCAR (blocks, root) {
  // @ts-expect-error
  const { writer, out } = CarWriter.create(root)
  /** @type {Error?} */
  let error
  void (async () => {
    try {
      for await (const block of blocks) {
        // @ts-expect-error
        await writer.put(block)
      }
    } catch (/** @type {any} */err) {
      error = err
    } finally {
      await writer.close()
    }
  })()
  const chunks = await collect(out)
  // @ts-expect-error
  if (error != null) throw error
  const roots = root != null ? [root] : []
  return Object.assign(new Blob(chunks), { version: 1, roots })
}
