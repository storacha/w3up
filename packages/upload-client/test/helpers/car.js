import { CarWriter } from '@ipld/car'
import * as CAR from '@ucanto/transport/car'
import { createFileEncoderStream } from '../../src/unixfs.js'

/**
 * @param {Uint8Array} bytes
 */
export async function toCAR(bytes) {
  const readableStream = ((createFileEncoderStream(new Blob([bytes]), {})))

  let blocks = [], chunks = []
  // @ts-expect-error readable Stream is also an async iterable
  for await (let block of readableStream) blocks.push(block)
  const rootCID = blocks.at(-1)?.cid

  const { writer, out } = CarWriter.create(rootCID)

  for (const block of blocks) writer.put(block)
  writer.close()

  for await (const chunk of out) chunks.push(chunk)
  
  const blob = new Blob(chunks)
  const cid = await CAR.codec.link(new Uint8Array(await blob.arrayBuffer()))
  return  Object.assign(blob, { cid, roots: [rootCID] })
}
