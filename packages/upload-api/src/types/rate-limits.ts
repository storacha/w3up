import * as Ucanto from '@ucanto/interface'

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
  remove: (id: RateLimitID) => Promise<Ucanto.Result<{}, Ucanto.Failure>>

  /**
   * Returns true if the given subject has a limit equal to 0.
   */
  areAnyBlocked: (
    subjects: string[]
  ) => Promise<Ucanto.Result<boolean, Ucanto.Failure>>
}
