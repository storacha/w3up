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
 * @template T
 * wrap an iterable in a new iterable that will iterate the same items,
 * but will error if the iterated items aren't sorted according to a comparator
 * @implements {Iterable<T>}
 */
class Sorted {
  sorted = /** @type {const} */ (true)
  /**
   * @param {Iterable<T>} iterable
   * @param {(a: T, b: T) => number} comparator
   */
  constructor(iterable, comparator) {
    this.iterable = iterable
    this.comparator = comparator
  }
  * [Symbol.iterator]() {
    const { comparator, iterable } = this
    let prev = null
    for (const cur of iterable) {
      if (prev && comparator(prev, cur) === 1) {
        throw Object.assign(
          new Error(
            `sequentially iterated items were not sorted as expected`
          ),
          { unsorted: [prev, cur], code: 'SORTED_EXPECTATION_UNMET' }
        )
      }
      yield cur
      prev = cur
    }
  }
}

/**
 * given an iterable of files, return another iterable that ensures
 * that the files are iterated in a sorted order.
 *
 * @param {Iterable<import('./types.js').FileLike>} files
 * @param {(file: import('./types.js').FileLike) => string} getSortKey - given a FileLike, return a value by which all the FileLikes should be sorted
 * @returns
 */
export const requireSortedFiles = (files, getSortKey = (a) => a.name) => {
  return new Sorted(files, (a, b) => defaultFileComparator(a, b, getSortKey))
}

/**
 * Default comparator for FileLikes. Sorts by file name in ascending order.
 *
 * @param {FileLike} a
 * @param {FileLike} b
 * @param {(file: FileLike) => string} getSortKey
 */
export const defaultFileComparator = (a, b, getSortKey = (a) => a.name) => {
  return ascending(a, b, getSortKey)
}

/**
 * a comparator for sorting in ascending order. Use with Sorted or Array#sort.
 *
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {(i: T) => any} getSortKey - given an item being sorted, return the value by which it should be sorted
 */
function ascending(a, b, getSortKey) {
  const ask = getSortKey(a)
  const bsk = getSortKey(b)
  if (ask === bsk) return 0
  else if (ask < bsk) return -1
  return 1
}
