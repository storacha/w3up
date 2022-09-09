import { webcrypto } from 'one-webcrypto'
import * as uint8arrays from 'uint8arrays'
import * as DID from '@ipld/dag-ucan/did'
import { AesKey } from './aes-key.js'
import {
  compressP256Pubkey,
  P256_DID_PREFIX,
  decompressP256,
} from './encoding.js'

/**
 * @param {CryptoKey} pubkey
 */
async function didFromPubkey(pubkey) {
  const buf = await webcrypto.subtle.exportKey('raw', pubkey)
  const bytes = new Uint8Array(buf)
  return DID.format(
    // eslint-disable-next-line unicorn/prefer-spread
    uint8arrays.concat([P256_DID_PREFIX, compressP256Pubkey(bytes)])
  )
}

/**
 * @param {import('@ipld/dag-ucan').DID} did
 */
function ecdhKeyFromDid(did) {
  // Parse did string and slice algorithm varint
  const view = DID.parse(did).slice(2)

  return webcrypto.subtle.importKey(
    'raw',
    decompressP256(view),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )
}

/**
 * @typedef {import('./types').KeyExchangeKeypair} SharedKey
 * @implements {SharedKey}
 */
export class EcdhKeypair {
  /**
   * @param {CryptoKeyPair} keypair
   */
  #keypair

  /**
   * @param {CryptoKeyPair} keypair
   */
  constructor(keypair) {
    this.#keypair = keypair
    this.didString = undefined
  }

  static async create() {
    const keypair = await webcrypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey', 'deriveBits', 'encrypt']
    )
    return new EcdhKeypair(keypair)
  }

  async did() {
    if (!this.didString) {
      this.didString = await didFromPubkey(this.#keypair.publicKey)
    }
    return this.didString
  }

  /**
   * @param {import('@ipld/dag-ucan').DID} otherDid
   */
  async deriveSharedKey(otherDid) {
    const publicKey = await ecdhKeyFromDid(otherDid)
    const key = await webcrypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      this.#keypair.privateKey,
      {
        name: 'HKDF',
        hash: 'SHA-512',
        info: uint8arrays.fromString('0x4157414B452D5543414E', 'base16'),
      },
      false,
      ['encrypt', 'decrypt']
    )
    return new AesKey(key)
  }

  /**
   * returns base64 encrypted data with iv prepended
   *
   * @param {string} data
   * @param {import('@ipld/dag-ucan').DID} otherDid
   */
  async encryptForDid(data, otherDid) {
    const sharedKey = await this.deriveSharedKey(otherDid)
    return sharedKey.encrypt(data)
  }

  /**
   * expects base64 encrypted data with iv prepended
   *
   * @param {string} data
   * @param {import('@ipld/dag-ucan').DID} otherDid
   */
  async decryptFromDid(data, otherDid) {
    const sharedKey = await this.deriveSharedKey(otherDid)
    return sharedKey.decrypt(data)
  }
}
