

/**
 * 
 * @param {import("../types").RateLimit} rateLimit 
 */
const isBlock = (rateLimit) => rateLimit.rate === 0

/**
 * 
 * @param {import("../types").RateLimit[]} rateLimits
 */
const areAnyBlocks = (rateLimits) => rateLimits.some(isBlock)

/**
 * Query rate limits storage and find out if any of the given subjects
 * have rate set to 0
 * 
 * @param {import("../types").RateLimitsStorage} storage 
 * @param {string[]} subjects 
 * @return {Promise<import("@ucanto/interface").Result<boolean, import("@ucanto/interface").Failure>>}
 */
export async function areAnyBlocked(storage, subjects) {
  const results = await Promise.all(subjects.map(subject => storage.list(subject)))
  let anyBlocks = false
  for (const result of results) {
    if (result.error) {
      return result
    } else {
      anyBlocks = anyBlocks && areAnyBlocks(result.ok)
    }
  }
  return { ok: anyBlocks }
}