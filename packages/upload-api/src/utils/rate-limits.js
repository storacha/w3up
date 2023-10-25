/**
 * Query rate limits storage and find out if any of the given subjects
 * have rate below the given limitThreshold. Return a Ucanto.Success result if
 * not, and a Ucanto.Error if so, or if we get an error from the underlying
 * store.
 *
 * @param {import("../types.js").RateLimitsStorage} storage
 * @param {string[]} subjects
 * @param {number} limitThreshold
 * @return {Promise<import("@ucanto/interface").Result<import("@ucanto/interface").Unit, import("@ucanto/interface").Failure>>}
 */
export async function ensureRateLimitAbove(storage, subjects, limitThreshold) {
  const results = await Promise.all(
    subjects.map((subject) => storage.list(subject))
  )
  for (const result of results) {
    if (result.error) {
      return result
    } else {
      for (const limit of result.ok) {
        if (limit.rate <= limitThreshold) {
          return {
            error: {
              name: 'RateLimitExceeded',
              message: `Rate limit of ${limit.rate} found which is above threshold of ${limitThreshold}`,
            },
          }
        }
      }
    }
  }
  return { ok: {} }
}
