import * as DID from '@ipld/dag-ucan/did'
import * as ED25519 from '@noble/ed25519'
import { varint } from 'multiformats'
// eslint-disable-next-line no-unused-vars
import * as API from '@ucanto/interface'
export const code = 0xed

export const name = 'Ed25519'
const PUBLIC_TAG_SIZE = varint.encodingLength(code)
const SIZE = 32 + PUBLIC_TAG_SIZE

/**
 * Parses `did:key:` string as an Audience.
 *
 * @param {API.DID} did
 * @returns {API.Principal<typeof code>}
 */
export const parse = (did) => decode(DID.parse(did))

/**
 * Takes ed25519 public key tagged with `0xed` multiformat code and creates a
 * corresponding `Authority` that can be used to verify signatures.
 *
 * @param {Uint8Array} bytes
 * @returns {API.Principal<typeof code>}
 */
export const decode = (bytes) => {
  const [algorithm] = varint.decode(bytes)
  if (algorithm !== code) {
    throw new RangeError(
      `Unsupported key algorithm with multicode 0x${code.toString(16)}`
    )
  } else if (bytes.byteLength !== SIZE) {
    throw new RangeError(
      `Expected Uint8Array with byteLength ${SIZE}, instead got Uint8Array with byteLength ${bytes.byteLength}`
    )
  } else {
    return new Authority(bytes.buffer, bytes.byteOffset)
  }
}

/**
 * Formats given authority into `did:key:` format.
 *
 * @param {API.Principal<typeof code>} authority
 */
export const format = (authority) => DID.format(authority.bytes)

/**
 * Encodes given authority by tagging it's ed25519 public key with `0xed`
 * multiformat code.
 *
 * @param {API.Principal<typeof code>} authority
 */
export const encode = (authority) => authority.bytes

/**
 * @implements {API.Principal<typeof code>}
 */
class Authority {
  /**
   * @param {ArrayBuffer} buffer
   * @param {number} [byteOffset]
   */
  constructor(buffer, byteOffset = 0) {
    /** @readonly */
    this.buffer = buffer
    /** @readonly */
    this.byteOffset = byteOffset
    /** @readonly */
    this.byteLength = SIZE
  }

  get bytes() {
    const bytes = new Uint8Array(this.buffer, this.byteOffset, this.byteLength)
    Object.defineProperties(this, { bytes: { value: bytes } })
    return bytes
  }

  /**
   * Raw public key without a multiformat code.
   *
   * @readonly
   */
  get publicKey() {
    const key = new Uint8Array(this.buffer, this.byteOffset + PUBLIC_TAG_SIZE)
    Object.defineProperties(this, {
      publicKey: {
        value: key,
      },
    })
    return key
  }

  /**
   * DID of the authority in `did:key` format.
   *
   * @returns {API.DID}
   */
  did() {
    return format(this)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof code>} signature
   * @returns {Promise<boolean>}
   */
  verify(payload, signature) {
    return ED25519.verify(signature, payload, this.publicKey)
  }
}
