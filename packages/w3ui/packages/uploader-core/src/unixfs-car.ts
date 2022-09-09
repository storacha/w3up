import * as UnixFS from '@ipld/unixfs'
import type { CID } from 'multiformats/cid'
import { CarWriter } from '@ipld/car'

const queuingStrategy = UnixFS.withCapacity(1048576 * 175)

export interface EncodeResult {
  root: CID
  car: AsyncIterable<Uint8Array>
}

export async function encodeFile (blob: Blob): Promise<EncodeResult> {
  const { readable, writable } = new TransformStream<UnixFS.Block, UnixFS.Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })

  const unixfsFileWriter = UnixFS.createFileWriter(unixfsWriter)
  unixfsFileWriter.write(new Uint8Array(await blob.arrayBuffer()))

  const { cid } = await unixfsFileWriter.close()

  unixfsWriter.close()

  // @ts-expect-error CarWriter expects a real CID instance
  const { writer: carBlockWriter, out } = CarWriter.create(cid)

  const carWriterPromise = (async () => {
    for await (const block of toIterable(readable)) {
      // @ts-expect-error expects a real CID instance
      await carBlockWriter.put(block)
    }
  })()

  carWriterPromise
    .catch(err => {
      console.error(err)
    })
    .finally(() => {
      carBlockWriter.close().catch(err => {
        // @ts-expect-error no cause in error constructor yet
        console.error(new Error('failed to close CAR writer', { cause: err }))
      })
    })

  return {
    // @ts-expect-error not a real CID?!
    root: cid,
    car: out
  }
}

function toIterable<T> (readable: ReadableStream<T>): AsyncIterable<T> {
  // @ts-expect-error
  if (readable[Symbol.asyncIterator] != null) return readable

  // Browser ReadableStream
  if (readable.getReader != null) {
    return (async function * () {
      const reader = readable.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })()
  }

  throw new Error('unknown stream')
}
