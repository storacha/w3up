import { CarWriter } from '@ipld/car'
import * as CAR from '@ucanto/transport/car'
import { toBlock } from './block.js'

/**
 * @param {Uint8Array} bytes
 **/
export async function toCAR(bytes) {
  const block = await toBlock(bytes)
  const { writer, out } = CarWriter.create(block.cid)
  writer.put(block)
  writer.close()

  const chunks = []
  for await (const chunk of out) {
    chunks.push(chunk)
  }
  const blob = new Blob(chunks)
  const cid = await CAR.codec.link(new Uint8Array(await blob.arrayBuffer()))

  return Object.assign(blob, { cid, roots: [block.cid] })
}
