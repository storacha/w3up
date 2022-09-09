import { webcrypto } from 'one-webcrypto'
import * as uint8arrays from 'uint8arrays'
import * as bigintModArith from 'bigint-mod-arith'

export const P256_DID_PREFIX = new Uint8Array([0x80, 0x24])
export const BASE58_DID_PREFIX = 'did:key:z' // z is the multibase prefix for base58btc byte encoding

/**
 * Unique 12-byte initialization vector
 */
export function randomIV() {
  return webcrypto.getRandomValues(new Uint8Array(12))
}

/**
 * Elliptic-curve-point-compression for p256 65 byte pubkey
 *
 * @param { Uint8Array} pubkeyBytes
 */
export function compressP256Pubkey(pubkeyBytes) {
  if (pubkeyBytes.length !== 65) {
    throw new Error('Expected 65 byte pubkey')
  } else if (pubkeyBytes[0] !== 0x04) {
    throw new Error('Expected first byte to be 0x04')
  }
  // first byte is a prefix
  const x = pubkeyBytes.slice(1, 33)
  const y = pubkeyBytes.slice(33, 65)
  const out = new Uint8Array(x.length + 1)

  out[0] = 2 + (y[y.length - 1] & 1)
  out.set(x, 1)

  return out
}

/**
 * Test to see if the argument is the Uint8Array
 *
 * @param {Uint8Array} [param]
 */
export function testUint8Array(param) {
  if (param === undefined) {
    return false
  }
  return param.constructor === Uint8Array
}

/**
 * Decompress a compressed public key in SEC format.
 * See section 2.3.3 in SEC 1 v2 : https://www.secg.org/sec1-v2.pdf.
 *
 * Code based on: https://stackoverflow.com/questions/17171542/algorithm-for-elliptic-curve-point-compression/30431547#30431547
 *
 * https://github.com/w3c-ccg/did-method-key/issues/32
 *
 * @param {Uint8Array} comp - 33 byte compressed public key. 1st byte: 0x02 for even or 0x03 for odd. Following 32 bytes: x coordinate expressed as big-endian.
 */
export function decompressP256(comp) {
  if (comp.length !== 33) {
    throw new TypeError('Expected 33 byte compress pubkey')
  } else if (comp[0] !== 0x02 && comp[0] !== 0x03) {
    throw new TypeError('Expected first byte to be 0x02 or 0x03')
  }

  // two, prime, b, and pIdent are constants for the P-256 curve
  const two = BigInt(2)
  const prime = two ** 256n - two ** 224n + two ** 192n + two ** 96n - 1n
  const b =
    41_058_363_725_152_142_129_326_129_780_047_268_409_114_441_015_993_725_554_835_256_314_039_467_401_291n
  const pIdent = (prime + 1n) / 4n

  const signY = BigInt(comp[0] - 2)
  const x = comp.subarray(1)
  const xBig = BigInt(uint8arrays.toString(x, 'base10'))

  const a = xBig ** 3n - xBig * 3n + b
  let yBig = bigintModArith.modPow(a, pIdent, prime)

  // If the parity doesn't match it's the *other* root"
  if (yBig % 2n !== signY) {
    // y = prime - y
    yBig = prime - yBig
  }

  const y = uint8arrays.fromString(yBig.toString(10), 'base10')

  // left-pad for smaller than 32 byte y
  const offset = 32 - y.length
  const yPadded = new Uint8Array(32)
  yPadded.set(y, offset)

  // concat coords & prepend P-256 prefix
  // eslint-disable-next-line unicorn/prefer-spread
  const publicKey = uint8arrays.concat([[0x04], x, yPadded])
  return publicKey
}
