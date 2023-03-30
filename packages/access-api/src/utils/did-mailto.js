/**
 *
 * @param {`did:${string}:${string}`} did
 * @returns
 */
export function toEmail(did) {
  const parts = did.split(':')
  if (parts[1] !== 'mailto') {
    throw new Error(`DID ${did} is not a mailto did.`)
  }
  return `${decodeURIComponent(parts[3])}@${decodeURIComponent(parts[2])}`
}
