import * as Ucanto from '@ucanto/interface'

// An opaque identifier used to identify rate limits. We use this instead of
// deriving it from, eg, {rate, subject} because we'd like to allow implementors
// to support more than one identical rate limit - an example of where this might
// be useful is a fraud prevention department flagging and blocking an account
// because they detected phishing sites being uploaded and, separately, a billing
// department blocking an account for non-payment. In this case the removal of one
// "block" should not result in both "blocks" being lifted.
export type RateLimitID = string

export interface RateLimit {
  /**
   * Identifier of this rate limit - can used to remove a limit.
   */
  id: RateLimitID
  /**
   * Rate limit applied to the subject - intentionally unitless, should be interpreted by consumer.
   */
  rate: number
}

/**
 * stores instances of a storage provider being consumed by a consumer
 */
export interface RateLimitsStorage {
  /**
   * Add rate limit for subject.
   *
   * @param subject identifier for subject - could be a DID, a URI, or anything else
   * @param rate a limit to be interpreted by the consuming system - intentionally unitless
   */
  add: (
    subject: string,
    rate: number
  ) => Promise<Ucanto.Result<{ id: RateLimitID }, Ucanto.Failure>>

  /**
   * Returns rate limits on subject.
   *
   * @param subjects a subject identifier - could be a DID, a URI, or anything else
   * @returns a list of rate limits for the idenfied subject
   */
  list: (subject: string) => Promise<Ucanto.Result<RateLimit[], Ucanto.Failure>>

  /**
   * Remove a rate limit with given ID.
   */
  remove: (
    id: RateLimitID
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>
}
