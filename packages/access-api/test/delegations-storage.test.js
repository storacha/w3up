import { context } from './helpers/context.js'
import { DbDelegationsStorageWithR2 } from '../src/models/delegations.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { collect } from 'streaming-iterables'

describe('DelegationsStorage with sqlite+R2', () => {
  testVariant(
    () => createDbDelegationsStorageVariantWithR2().create(),
    (name, doTest) => {
      it(name, doTest)
    }
  )
})

/**
 * @param {object} [opts]
 * @param {Ucanto.Signer<Ucanto.DID>} [opts.issuer]
 * @param {Ucanto.Principal} [opts.audience]
 * @param {Ucanto.Capabilities} [opts.capabilities]
 * @returns {Promise<Ucanto.Delegation>}
 */
async function createDelegation(opts = {}) {
  const {
    issuer = await principal.ed25519.generate(),
    audience = issuer,
    capabilities = [
      {
        can: 'test/*',
        with: issuer.did(),
      },
    ],
  } = opts
  return await ucanto.delegate({
    issuer,
    audience,
    capabilities,
  })
}

/**
 * create a variant of DelegationsStorage that uses sqlite for most things
 * but stores blobs in a separate r2-like key/value store
 *
 * @see https://github.com/web3-storage/w3protocol/issues/571
 */
function createDbDelegationsStorageVariantWithR2() {
  return {
    /**
     * @returns {Promise<DelegationsStorageVariant>}
     */
    create: async () => {
      const { d1, mf } = await context()
      const accessApiR2 = await mf.getR2Bucket('ACCESS_API_R2')
      const delegationsStorage = new DbDelegationsStorageWithR2(
        createD1Database(d1),
        accessApiR2
      )
      return { delegations: delegationsStorage }
    },
  }
}

/**
 * @typedef {object} DelegationsStorageVariant
 * @property {Pick<import('../src/types/delegations.js').DelegationsStorage, 'putMany'|'count'|'find'>} delegations
 */

/**
 * @param {() => Promise<DelegationsStorageVariant>} createVariant - create a new test context
 * @param {(name: string, test: () => Promise<unknown>) => void} test - name a test
 */
function testVariant(createVariant, test) {
  test('should persist delegations', async () => {
    const { delegations: delegationsStorage } = await createVariant()
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await delegationsStorage.putMany(...delegations)
    assert.deepEqual(await delegationsStorage.count(), delegations.length)
  })
  test('can retrieve delegations by audience', async () => {
    const { delegations } = await createVariant()
    const issuer = await principal.ed25519.generate()

    const alice = await principal.ed25519.generate()
    const delegationsForAlice = await Promise.all(
      Array.from({ length: 1 }).map(() =>
        createDelegation({ issuer, audience: alice })
      )
    )

    const bob = await principal.ed25519.generate()
    const delegationsForBob = await Promise.all(
      Array.from({ length: 2 }).map((e, i) =>
        createDelegation({
          issuer,
          audience: bob,
          capabilities: [
            {
              can: `test/${i}`,
              with: alice.did(),
            },
          ],
        })
      )
    )

    await delegations.putMany(...delegationsForAlice, ...delegationsForBob)

    const aliceDelegations = await collect(
      delegations.find({ audience: alice.did() })
    )
    assert.deepEqual(aliceDelegations.length, delegationsForAlice.length)

    const bobDelegations = await collect(
      delegations.find({ audience: bob.did() })
    )
    assert.deepEqual(bobDelegations.length, delegationsForBob.length)

    const carol = await principal.ed25519.generate()
    const carolDelegations = await collect(
      delegations.find({ audience: carol.did() })
    )
    assert.deepEqual(carolDelegations.length, 0)
  })
}
