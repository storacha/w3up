import * as UCAN from '@ipld/dag-ucan'
export interface KeyExchangeKeypair {
  deriveSharedKey: (otherDID: UCAN.DID) => Promise<EncryptionKeypair>
  encryptForDid: (data: string, otherDID: UCAN.DID) => Promise<string>
  decryptFromDid: (data: string, otherDID: UCAN.DID) => Promise<string>
  did: UCAN.DID
  pubkey: () => Promise<Uint8Array>
}

export interface EncryptionKeypair {
  encrypt: (data: string) => Promise<string>
  decrypt: (data: string) => Promise<string>
}
