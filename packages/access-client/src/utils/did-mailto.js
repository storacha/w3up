/**
 * @param {string} email
 * @returns {`did:mailto:${string}:${string}`}
 */
export function createDidMailtoFromEmail(email) {
  const emailParts = email.split('@')
  if (emailParts.length !== 2) {
    throw new Error(`unexpected email ${email}`)
  }
  const [local, domain] = emailParts
  const did = /** @type {const} */ (
    `did:mailto:${encodeURIComponent(domain)}:${encodeURIComponent(local)}`
  )
  return did
}
