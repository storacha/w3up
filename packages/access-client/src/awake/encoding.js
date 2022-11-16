/* eslint-disable unicorn/prefer-spread */
import * as u8 from 'uint8arrays'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 *
 * @param {ArrayLike<number>[]} buffers
 * @param {import('uint8arrays/to-string').SupportedEncodings} [encoding]
 */
export async function concatEncode(buffers, encoding = 'base64') {
  const out = await sha256.encode(u8.concat(buffers))

  return u8.toString(out, encoding)
}
