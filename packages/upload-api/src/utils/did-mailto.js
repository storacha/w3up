import * as DidMailto from '@web3-storage/did-mailto'

/**
 * @param {import("@web3-storage/did-mailto/dist/src/types").DidMailto} mailtoDid
 */
export function mailtoDidToEmail(mailtoDid) {
  return DidMailto.toEmail(DidMailto.fromString(mailtoDid))
}

/**
 * @param {import("@web3-storage/did-mailto/dist/src/types").DidMailto} mailtoDid
 */
export function mailtoDidToDomain(mailtoDid) {
  const accountEmail = mailtoDidToEmail(mailtoDid)
  const accountDomain = accountEmail.split('@')[1]
  return accountDomain
}
