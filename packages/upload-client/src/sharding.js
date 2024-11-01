import { DigestMap } from '@storacha/blob-index'
import {
  blockEncodingLength,
  blockHeaderEncodingLength,
  encode,
  headerEncodingLength,
} from './car.js'

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
 * @extends {TransformStream<import('@ipld/unixfs').Block, import('./types.js').IndexedCARFile>}
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
    /** @type {Map<import('./types.js').SliceDigest, import('./types.js').Position>} */
    let slices = new DigestMap()
    /** @type {Map<import('./types.js').SliceDigest, import('./types.js').Position> | null} */
    let readySlices = null
    let currentLength = 0

    super({
      async transform(block, controller) {
        if (readyBlocks != null && readySlices != null) {
          controller.enqueue(await encodeCAR(readyBlocks, readySlices))
          readyBlocks = null
          readySlices = null
        }

        const blockHeaderLength = blockHeaderEncodingLength(block)
        const blockLength = blockHeaderLength + block.bytes.length
        if (blockLength > maxBlockLength) {
          throw new Error(
            `block will cause CAR to exceed shard size: ${block.cid}`
          )
        }

        if (blocks.length && currentLength + blockLength > maxBlockLength) {
          readyBlocks = blocks
          readySlices = slices
          blocks = []
          slices = new DigestMap()
          currentLength = 0
        }
        blocks.push(block)
        slices.set(block.cid.multihash, [
          headerEncodingLength() + currentLength + blockHeaderLength,
          block.bytes.length,
        ])
        currentLength += blockLength
      },

      async flush(controller) {
        if (readyBlocks != null && readySlices != null) {
          controller.enqueue(await encodeCAR(readyBlocks, readySlices))
        }

        const rootBlock = blocks.at(-1)
        if (rootBlock == null) return

        const rootCID = options.rootCID ?? rootBlock.cid
        const headerLength = headerEncodingLength(rootCID)

        // if adding CAR root overflows the shard limit we move overflowing
        // blocks into another CAR.
        if (headerLength + currentLength > shardSize) {
          const overage = headerLength + currentLength - shardSize
          const overflowBlocks = []
          let overflowCurrentLength = 0
          while (overflowCurrentLength < overage) {
            const block = blocks[blocks.length - 1]
            blocks.pop()
            slices.delete(block.cid.multihash)
            overflowBlocks.unshift(block)
            overflowCurrentLength += blockEncodingLength(block)

            // need at least 1 block in original shard
            if (blocks.length < 1)
              throw new Error(
                `block will cause CAR to exceed shard size: ${block.cid}`
              )
          }
          controller.enqueue(await encodeCAR(blocks, slices))

          // Finally, re-calc block positions from blocks we moved out of the
          // CAR that was too big.
          overflowCurrentLength = 0
          /** @type {Map<import('./types.js').SliceDigest, import('./types.js').Position>} */
          const overflowSlices = new DigestMap()
          for (const block of blocks) {
            const overflowBlockHeaderLength = blockHeaderEncodingLength(block)
            overflowSlices.set(block.cid.multihash, [
              headerLength + overflowCurrentLength + overflowBlockHeaderLength,
              block.bytes.length,
            ])
            overflowCurrentLength +=
              overflowBlockHeaderLength + block.bytes.length
          }
          controller.enqueue(
            await encodeCAR(overflowBlocks, overflowSlices, rootCID)
          )
        } else {
          // adjust offsets for longer header in final shard
          const diff = headerLength - headerEncodingLength()
          for (const slice of slices.values()) {
            slice[0] += diff
          }
          controller.enqueue(await encodeCAR(blocks, slices, rootCID))
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
function ascending(a, b, getComparedValue) {
  const ask = getComparedValue(a)
  const bsk = getComparedValue(b)
  if (ask === bsk) return 0
  else if (ask < bsk) return -1
  return 1
}

/**
 * @param {Iterable<import('@ipld/unixfs').Block>} blocks
 * @param {Map<import('./types.js').SliceDigest, import('./types.js').Position>} slices
 * @param {import('./types.js').AnyLink} [root]
 * @returns {Promise<import('./types.js').IndexedCARFile>}
 */
const encodeCAR = async (blocks, slices, root) =>
  Object.assign(await encode(blocks, root), { slices })
