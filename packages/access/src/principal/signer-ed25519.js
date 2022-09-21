import * as ED25519 from '@noble/ed25519'
import { varint } from 'multiformats'
// eslint-disable-next-line no-unused-vars
import * as API from '@ucanto/interface'
import * as Authority from './verifier-ed25519.js'
import { base64pad } from 'multiformats/bases/base64'
// eslint-disable-next-line no-unused-vars
import * as Types from './types.js'

export const code = 0x13_00
export const name = Authority.name

const PRIVATE_TAG_SIZE = varint.encodingLength(code)
const PUBLIC_TAG_SIZE = varint.encodingLength(Authority.code)
const KEY_SIZE = 32
const SIZE = PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE + KEY_SIZE

/**
 * Generates new issuer by generating underlying ED25519 keypair.
 *
 * @returns {Promise<Types.SigningPrincipal<typeof Authority.code>>}
 */
export const generate = () => derive(ED25519.utils.randomPrivateKey())

/**
 * Derives issuer from 32 byte long secret key.
 *
 * @param {Uint8Array} secret
 * @returns {Promise<Types.SigningPrincipal<typeof Authority.code>>}
 */
export const derive = async (secret) => {
  if (secret.byteLength !== KEY_SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${KEY_SIZE} instead not ${secret.byteLength}`
    )
  }

  const publicKey = await ED25519.getPublicKey(secret)
  const bytes = new Uint8Array(SIZE)

  varint.encodeTo(code, bytes, 0)
  bytes.set(secret, PRIVATE_TAG_SIZE)

  varint.encodeTo(Authority.code, bytes, PRIVATE_TAG_SIZE + KEY_SIZE)
  bytes.set(publicKey, PRIVATE_TAG_SIZE + KEY_SIZE + PUBLIC_TAG_SIZE)

  return new Ed25519Signer(bytes)
}

/**
 *
 * @param {Uint8Array} bytes
 */
export const decode = (bytes) => {
  if (bytes.byteLength !== SIZE) {
    throw new Error(
      `Expected Uint8Array with byteLength of ${SIZE} instead not ${bytes.byteLength}`
    )
  }

  {
    const [keyCode] = varint.decode(bytes)
    if (keyCode !== code) {
      throw new Error(`Given bytes must be a multiformat with ${code} tag`)
    }
  }

  {
    const [code] = varint.decode(bytes.subarray(PRIVATE_TAG_SIZE + KEY_SIZE))
    if (code !== Authority.code) {
      throw new Error(
        `Given bytes must contain public key in multiformats with ${Authority.code} tag`
      )
    }
  }

  return new Ed25519Signer(bytes)
}

/**
 * @template {string} Prefix
 * @param {string} signingAuthority
 * @param {API.MultibaseDecoder<Prefix>} [decoder]
 */
export const parse = (signingAuthority, decoder) =>
  decode((decoder || base64pad).decode(signingAuthority))

/**
 * @implements {Types.SigningPrincipal<typeof Authority.code>}
 */
class Ed25519Signer {
  /**
   * @param {Uint8Array} bytes
   */
  constructor(bytes) {
    this.buffer = bytes.buffer
    this.byteOffset = bytes.byteOffset
    this.byteLength = SIZE
    this.bytes = bytes
  }

  get principal() {
    const bytes = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE + KEY_SIZE)
    const principal = Authority.decode(bytes)

    Object.defineProperties(this, {
      principal: {
        value: principal,
      },
    })

    return principal
  }

  /**
   * Raw public key without multiformat code.
   */
  get secret() {
    const secret = new Uint8Array(this.buffer, PRIVATE_TAG_SIZE, KEY_SIZE)
    Object.defineProperties(this, {
      secret: {
        value: secret,
      },
    })

    return secret
  }

  /**
   * DID of the authority in `did:key` format.
   *
   * @returns {API.DID}
   */
  did() {
    return this.principal.did()
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @returns {Promise<API.Signature<T, typeof Authority.code>>}
   */
  sign(payload) {
    return ED25519.sign(payload, this.secret)
  }

  /**
   * @template T
   * @param {API.ByteView<T>} payload
   * @param {API.Signature<T, typeof Authority.code>} signature
   */
  verify(payload, signature) {
    return this.principal.verify(payload, signature)
  }

  /**
   * @template {string} Prefix
   * @param {API.MultibaseEncoder<Prefix>} [encoder]
   */
  format(encoder) {
    return (encoder || base64pad).encode(this.bytes)
  }
}
