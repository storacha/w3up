import * as DidMailto from '@web3-storage/did-mailto'

/**
 * @param {string} email
 * @returns {`did:mailto:${string}:${string}`}
 */
export function createDidMailtoFromEmail(email) {
  return DidMailto.fromEmail(DidMailto.email(email))
}
