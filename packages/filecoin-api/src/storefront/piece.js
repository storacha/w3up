import { Piece } from '@web3-storage/data-segment'
import * as Hasher from 'fr32-sha2-256-trunc254-padded-binary-tree-multihash'
import * as Digest from 'multiformats/hashes/digest'

import { ComputePieceFailed } from '../errors.js'

/**
 * Compute PieceCid for provided async iterable.
 *
 * @param {AsyncIterable<Uint8Array>} stream
 */
export async function computePieceCid(stream) {
  /** @type {import('../types.js').PieceLink} */
  let piece
  try {
    const hasher = Hasher.create()
    for await (const chunk of stream) {
      hasher.write(chunk)
    }

    // ⚠️ Because digest size will dependen on the payload (padding)
    // we have to determine number of bytes needed after we're done
    // writing payload
    const digest = new Uint8Array(hasher.multihashByteLength())
    hasher.digestInto(digest, 0, true)

    // There's no GC (yet) in WASM so you should free up
    // memory manually once you're done.
    hasher.free()
    const multihashDigest = Digest.decode(digest)
    // @ts-expect-error some properties from PieceDigest are not present in MultihashDigest
    piece = Piece.fromDigest(multihashDigest)
  } catch (/** @type {any} */ error) {
    return {
      error: new ComputePieceFailed(`failed to compute piece CID for bytes`, {
        cause: error,
      }),
    }
  }

  return {
    ok: { piece },
  }
}
