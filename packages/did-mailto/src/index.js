export * from './types.js'

/**
 * create a did:mailto from an email address
 *
 * @param {import("./types.js").EmailAddress} email
 * @returns {import("./types.js").DidMailto}
 */
export function fromEmail(email) {
  const { domain, local } = parseEmail(email)
  const did = /** @type {const} */ (
    `did:mailto:${encodeURIComponent(domain)}:${encodeURIComponent(local)}`
  )
  return did
}

/**
 * @param {import("./types.js").DidMailto} did
 * @returns {import("./types.js").EmailAddress}
 */
export function toEmail(did) {
  const parts = did.split(':')
  if (parts[1] !== 'mailto') {
    throw new Error(`DID ${did} is not a mailto did.`)
  }
  return `${decodeURIComponent(parts[3])}@${decodeURIComponent(parts[2])}`
}

/**
 * given a string, if it is an EmailAddress, return it, otherwise throw an error.
 * Use this to parse string input to `EmailAddress` type to pass to `fromEmail` (when needed).
 * This is not meant to be a general RFC5322 (et al) email address validator, which would be more expensive.
 *
 * @param {string} input
 * @returns {import("./types.js").EmailAddress}
 */
export function email(input) {
  const { domain, local } = parseEmail(input)
  /** @type {import("./types.js").EmailAddress} */
  const emailAddress = `${local}@${domain}`
  return emailAddress
}

/**
 * parse a did mailto from a string
 *
 * @param {string} input
 * @returns {import("./types.js").DidMailto}
 */
export function fromString(input) {
  const colonParts = input.split(':')
  if (colonParts.length !== 4) {
    throw new TypeError(
      `expected did:mailto to have 4 colon-delimited segments, but got ${colonParts.length}`
    )
  }
  const [domain, local] = [colonParts[2], colonParts[3]]
  return `did:mailto:${domain}:${local}`
}

/**
 * @param {string} email
 */
function parseEmail(email) {
  const atParts = email.split('@')
  if (atParts.length < 2) {
    throw new TypeError(
      `expected at least 2 @-delimited segments, but got ${atParts.length}`
    )
  }
  const domain = atParts.at(-1) ?? ''
  const local = atParts.slice(0, -1).join('@')
  return { domain, local }
}
