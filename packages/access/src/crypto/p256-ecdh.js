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
    DID.decode(
      // eslint-disable-next-line unicorn/prefer-spread
      uint8arrays.concat([P256_DID_PREFIX, compressP256Pubkey(bytes)])
    )
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
 * @param {import('@ipld/dag-ucan').DID} did
 */
export async function pubkeyBytesFromDID(did) {
  const cryptoKey = await ecdhKeyFromDid(did)
  const buf = await webcrypto.subtle.exportKey('raw', cryptoKey)
  return new Uint8Array(buf)
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
   * @param {import('@ipld/dag-ucan').DID} did
   */
  constructor(keypair, did) {
    this.#keypair = keypair
    this.did = did
  }

  static async ecdhKey() {
    const keypair = await webcrypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey', 'deriveBits']
    )
    const did = await didFromPubkey(keypair.publicKey)
    return { keypair, did }
  }

  static async create() {
    const { keypair, did } = await EcdhKeypair.ecdhKey()
    return new EcdhKeypair(keypair, did)
  }

  async pubkey() {
    const buf = await webcrypto.subtle.exportKey('raw', this.#keypair.publicKey)
    return new Uint8Array(buf)
  }

  /**
   * @param {import('@ipld/dag-ucan').DID} otherDid
   */
  async deriveSharedKey(otherDid) {
    const publicKey = await ecdhKeyFromDid(otherDid)

    // probably need to derive another key with HKDF for the next step ?

    // const bits = await webcrypto.subtle.deriveBits(
    //   { name: 'ECDH', public: publicKey },
    //   this.#keypair.privateKey,
    //   256
    // )

    // const khdf = await webcrypto.subtle.deriveBits(
    //   {
    //     name: 'HKDF',
    //     hash: 'SHA-512',
    //     info: '0x4157414B452D5543414E',
    //     salt: bits,
    //   },
    //   this.#keypair.privateKey,
    //   608 // 512
    // )

    // first 256 is the secret to the next hkdf
    // import key with the second 256 as aes key
    // 512-603 to the next aes IV

    // this.#keypair = await webcrypto.subtle.generateKey(
    //   { name: 'ECDH', namedCurve: 'P-256' },
    //   false,
    //   ['deriveKey', 'deriveBits']
    // )

    // message key encrytion - this should be just import key from bits
    const key = await webcrypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      this.#keypair.privateKey,
      {
        name: 'AES-GCM',
        length: 256,
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
   * @type {SharedKey['decryptFromDid']}
   */
  async decryptFromDid(data, otherDid) {
    const sharedKey = await this.deriveSharedKey(otherDid)
    return sharedKey.decrypt(data)
  }
}
