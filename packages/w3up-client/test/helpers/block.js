import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

/** @param {Uint8Array} bytes */
export async function toBlock(bytes) {
  const hash = await sha256.digest(bytes)
  const cid = CID.createV1(raw.code, hash)
  return { cid, bytes }
}
