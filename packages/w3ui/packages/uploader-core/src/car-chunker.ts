import { Block } from '@ipld/unixfs'
import { CarWriter } from '@ipld/car'
import { CID } from 'multiformats/cid'
import { toIterable } from './streams'

// most thing are < 30MB
const CHUNK_SIZE = 1024 * 1024 * 30

export interface ChunkerOptions {
  /**
   * The target chunk size. Actual size of CAR output may be bigger due to
   * CAR header and block encoding data.
   */
  chunkSize?: number
}

/**
 * Chunk a set of blocks into a set of CAR files. The last block is assumed to
 * be the DAG root and becomes the CAR root CID for the last CAR output.
 */
export async function * chunkBlocks (stream: ReadableStream<Block>, options: ChunkerOptions = {}): AsyncIterable<AsyncIterable<Uint8Array>> {
  const blocks = toIterable(stream)
  const chunkSize = options.chunkSize ?? CHUNK_SIZE
  let chunk: Block[] = []
  let readyChunk: Block[] | null = null
  let size = 0
  for await (const block of blocks) {
    if (readyChunk != null) {
      yield encodeCar(readyChunk)
      readyChunk = null
    }
    if (size + block.bytes.length > chunkSize) {
      readyChunk = chunk
      chunk = []
      size = 0
    }
    chunk.push(block)
    size += block.bytes.length
  }

  if (readyChunk != null) {
    yield encodeCar(readyChunk)
  }

  if (chunk.length > 0) { // edge case, no blocks from the iterator
    // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
    yield encodeCar(chunk, [chunk[chunk.length - 1].cid])
  }
}

function encodeCar (blocks: Iterable<Block>, roots?: CID[]): AsyncIterable<Uint8Array> {
  const { writer, out } = CarWriter.create(roots)
  void (async () => {
    for (const block of blocks) {
      // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
      await writer.put(block)
    }
    await writer.close()
  })()
  return out
}
