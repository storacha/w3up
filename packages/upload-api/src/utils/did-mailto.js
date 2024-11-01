import * as DidMailto from '@storacha/did-mailto'

/**
 * @param {import("@storacha/did-mailto/types").DidMailto} mailtoDid
 */
export function mailtoDidToEmail(mailtoDid) {
  return DidMailto.toEmail(DidMailto.fromString(mailtoDid))
}

/**
 * @param {import("@storacha/did-mailto/types").DidMailto} mailtoDid
 */
export function mailtoDidToDomain(mailtoDid) {
  const accountEmail = mailtoDidToEmail(mailtoDid)
  const accountDomain = accountEmail.split('@')[1]
  return accountDomain
}
