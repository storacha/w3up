import * as DidMailto from '@web3-storage/did-mailto'

/**
 * @param {import("@web3-storage/did-mailto/dist/src/types").DidMailto} mailtoDid
 */
export function emailAndDomainFromMailtoDid(mailtoDid) {
  const accountEmail = DidMailto.email(DidMailto.fromString(mailtoDid))
  const accountDomain = accountEmail.split('@')[1]
  return [accountEmail, accountDomain]
}
