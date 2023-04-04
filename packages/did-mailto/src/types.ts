// https://datatracker.ietf.org/doc/html/rfc5322#section-3.4.1
export type LocalPart = string
export type Domain = string
export type EmailAddress = `${LocalPart}@${Domain}`

// https://www.rfc-editor.org/rfc/rfc3986#section-2.1
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type PercentEncoded<T extends string> = string

// did:mailto
export type DidMailto =
  `did:mailto:${PercentEncoded<Domain>}:${PercentEncoded<LocalPart>}`
