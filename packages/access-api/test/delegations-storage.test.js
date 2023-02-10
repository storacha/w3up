import { context } from './helpers/context.js'
import { DbDelegationsStorage } from '../src/models/delegations.js'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'

describe('DbDelegationsStorage', () => {
  it('should persist delegations', async () => {
    const { d1 } = await context()
    const storage = new DbDelegationsStorage(createD1Database(d1))
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await storage.push(...delegations)
    assert.deepEqual(await storage.length, delegations.length)
  })
})

/**
 *
 * @param {object} options
 * @param {PromiseLike<principal.ed25519.EdSigner>} [options.audience]
 * @param {PromiseLike<principal.ed25519.EdSigner>} [options.issuer]
 * @param {Ucanto.URI} [options.with]
 * @param {Ucanto.Ability} [options.can]
 */
async function createSampleDelegation(options = {}) {
  const {
    issuer = Promise.resolve(principal.ed25519.generate()),
    audience = Promise.resolve(principal.ed25519.generate()),
    can,
  } = options
  const delegation = await ucanto.delegate({
    issuer: await issuer,
    audience: await audience,
    capabilities: [
      {
        with: options.with || 'urn:',
        can: can || 'test/*',
      },
    ],
  })
  return delegation
}
