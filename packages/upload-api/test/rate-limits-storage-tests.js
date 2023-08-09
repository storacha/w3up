import * as API from '../src/types.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'should persist rate limits': async (assert, context) => {
    const storage = context.rateLimitsStorage
    const subject = 'travis@example.com'
    const result = await storage.add(subject, 0)
    assert.ok(result.ok)
    if (!result.ok) {
      throw new Error('storing rate limit failed!')
    }

    const limitsResult = await storage.list(subject)
    assert.ok(limitsResult.ok)
    if (!limitsResult.ok) {
      throw new Error('listing rate limits failed!')
    }

    assert.equal(limitsResult.ok.length, 1)
  },

  'should list rate limits': async (assert, context) => {
    const storage = context.rateLimitsStorage
    const subject = 'travis@example.com'
    await storage.add(subject, 0)
    await storage.add(subject, 2)

    const limitsResult = await storage.list(subject)
    assert.ok(limitsResult.ok)
    if (!limitsResult.ok) {
      throw new Error('listing rate limits failed!')
    }

    assert.equal(limitsResult.ok.length, 2)
  },

  'should allow rate limits to be deleted': async (assert, context) => {
    const storage = context.rateLimitsStorage
    const subject = 'travis@example.com'
    const result = await storage.add(subject, 0)
    assert.ok(result.ok)
    if (!result.ok) {
      throw new Error('storing rate limit failed!')
    }

    const limitsResult = await storage.list(subject)
    assert.ok(limitsResult.ok)
    if (!limitsResult.ok) {
      throw new Error('listing rate limits failed!')
    }

    assert.equal(limitsResult.ok.length, 1)

    const removeResult = await storage.remove(result.ok.id)
    assert.ok(removeResult.ok)
    if (!result.ok) {
      throw new Error('removing rate limit failed!')
    }

    const secondLimitsResult = await storage.list(subject)
    assert.ok(secondLimitsResult.ok)
    if (!secondLimitsResult.ok) {
      throw new Error('listing rate limits failed!')
    }
    assert.equal(secondLimitsResult.ok.length, 0)
  },
}
