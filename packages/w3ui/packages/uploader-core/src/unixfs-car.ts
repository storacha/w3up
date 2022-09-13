import * as UnixFS from '@ipld/unixfs'
import type { Block } from '@ipld/unixfs'
import type { CID } from 'multiformats/cid'
import { CarWriter } from '@ipld/car'
import { toIterable } from './streams'

const queuingStrategy = UnixFS.withCapacity(1048576 * 175)

export interface EncodeResult {
  root: CID
  car: AsyncIterable<Uint8Array>
}

export async function encodeFile (blob: Blob): Promise<EncodeResult> {
  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })

  const unixfsFileWriter = UnixFS.createFileWriter(unixfsWriter)
  await unixfsFileWriter.write(new Uint8Array(await blob.arrayBuffer()))

  const { cid } = await unixfsFileWriter.close()

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  const { writer: carBlockWriter, out } = CarWriter.create(cid)

  let error: Error

  void (async () => {
    try {
      await unixfsWriter.close()
    } catch (err) {
      // @ts-expect-error
      error = new Error('failed to close UnixFS writer stream', { cause: err })
    }
  })()

  void (async () => {
    try {
      for await (const block of toIterable(readable)) {
        // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
        await carBlockWriter.put(block)
      }
    } catch (err: any) {
      error = err
    } finally {
      try {
        await carBlockWriter.close()
      } catch (err: any) {
        error = err
      }
    }
  })()

  return {
    // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
    root: cid,
    car: (async function * () {
      yield * out
      // @ts-expect-error Variable 'error' is used before being assigned.
      if (error != null) throw error
    })()
  }
}
