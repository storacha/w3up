import { blockEncodingLength, encode, headerEncodingLength } from './car.js'

/**
 * @typedef {import('./types.js').FileLike} FileLike
 */

// https://observablehq.com/@gozala/w3up-shard-size
const SHARD_SIZE = 133_169_152

/**
 * Shard a set of blocks into a set of CAR files. By default the last block
 * received is assumed to be the DAG root and becomes the CAR root CID for the
 * last CAR output. Set the `rootCID` option to override.
 *
 * @extends {TransformStream<import('@ipld/unixfs').Block, import('./types.js').CARFile>}
 */
export class ShardingStream extends TransformStream {
  /**
   * @param {import('./types.js').ShardingOptions} [options]
   */
  constructor(options = {}) {
    const shardSize = options.shardSize ?? SHARD_SIZE
    const maxBlockLength = shardSize - headerEncodingLength()
    /** @type {import('@ipld/unixfs').Block[]} */
    let blocks = []
    /** @type {import('@ipld/unixfs').Block[] | null} */
    let readyBlocks = null
    let currentLength = 0

    super({
      async transform(block, controller) {
        if (readyBlocks != null) {
          controller.enqueue(await encode(readyBlocks))
          readyBlocks = null
        }

        const blockLength = blockEncodingLength(block)
        if (blockLength > maxBlockLength) {
          throw new Error(
            `block will cause CAR to exceed shard size: ${block.cid}`
          )
        }

        if (blocks.length && currentLength + blockLength > maxBlockLength) {
          readyBlocks = blocks
          blocks = []
          currentLength = 0
        }
        blocks.push(block)
        currentLength += blockLength
      },

      async flush(controller) {
        if (readyBlocks != null) {
          controller.enqueue(await encode(readyBlocks))
        }

        const rootBlock = blocks.at(-1)
        if (rootBlock == null) return

        const rootCID = options.rootCID ?? rootBlock.cid
        const headerLength = headerEncodingLength(rootCID)

        // if adding CAR root overflows the shard limit we move overflowing
        // blocks into a another CAR.
        if (headerLength + currentLength > shardSize) {
          const overage = headerLength + currentLength - shardSize
          const overflowBlocks = []
          let overflowCurrentLength = 0
          while (overflowCurrentLength < overage) {
            const block = blocks[blocks.length - 1]
            blocks.pop()
            overflowBlocks.unshift(block)
            overflowCurrentLength += blockEncodingLength(block)

            // need at least 1 block in original shard
            if (blocks.length < 1)
              throw new Error(
                `block will cause CAR to exceed shard size: ${block.cid}`
              )
          }
          controller.enqueue(await encode(blocks))
          controller.enqueue(await encode(overflowBlocks, rootCID))
        } else {
          controller.enqueue(await encode(blocks, rootCID))
        }
      },
    })
  }
}

/**
 * Default comparator for FileLikes. Sorts by file name in ascending order.
 *
 * @param {FileLike} a
 * @param {FileLike} b
 * @param {(file: FileLike) => string} getComparedValue - given a file being sorted, return the value by which its order should be determined, if it is different than the file object itself (e.g. file.name)
 */
export const defaultFileComparator = (
  a,
  b,
  getComparedValue = (file) => file.name
) => {
  return ascending(a, b, getComparedValue)
}

/**
 * a comparator for sorting in ascending order. Use with Sorted or Array#sort.
 *
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {(i: T) => any} getComparedValue - given an item being sorted, return the value by which it should be sorted, if it is different than the item
 */
function ascending(a, b, getComparedValue = (a) => a) {
  const ask = getComparedValue(a)
  const bsk = getComparedValue(b)
  if (ask === bsk) return 0
  else if (ask < bsk) return -1
  return 1
}
