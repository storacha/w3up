import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'

/**
 * @param {object} options
 * @param {PromiseLike<principal.ed25519.EdSigner>} [options.audience]
 * @param {PromiseLike<principal.ed25519.EdSigner>} [options.issuer]
 * @param {Ucanto.URI} [options.with]
 * @param {Ucanto.Ability} [options.can]
 */
export async function createSampleDelegation(options = {}) {
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
