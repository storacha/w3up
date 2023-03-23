import { context } from './helpers/context.js'
import { DbDelegationsStorageWithR2 } from '../src/models/delegations.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as principal from '@ucanto/principal'
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { collect } from 'streaming-iterables'
import { CID } from 'multiformats'
import { base32 } from 'multiformats/bases/base32'

describe('DelegationsStorage with sqlite+R2', () => {
  testVariant(createDbDelegationsStorageVariantWithR2, it)
  testCloudflareVariant(createDbDelegationsStorageVariantWithR2, it)
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
async function createDbDelegationsStorageVariantWithR2() {
  const { d1, mf } = await context()
  const accessApiR2 = await mf.getR2Bucket('ACCESS_API_R2')
  const delegationsStorage = new DbDelegationsStorageWithR2(
    createD1Database(d1),
    accessApiR2
  )
  return {
    d1,
    delegations: delegationsStorage,
    r2: accessApiR2,
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

/**
 * @param {() => Promise<DelegationsStorageVariant & { d1: D1Database, r2: import('../src/types/access-api-cf-db').R2Bucket }>} createVariant - create a new test context
 * @param {(name: string, test: () => Promise<unknown>) => void} test - name a test
 */
function testCloudflareVariant(createVariant, test) {
  test('puts into d1+r2', async () => {
    const { d1, delegations, r2 } = await createVariant()
    const multibasePrefixes = { base32: base32.prefix }
    const expectMultibase = 'base32'
    const multihashCodes = {
      // https://github.com/multiformats/multicodec/blob/aa0c3a41473c0a3796cdf2175ac5552989b2a905/table.csv#L9
      'sha2-256': 0x12,
    }
    const expectMultihash = multihashCodes['sha2-256']

    const ucan1 = await createSampleDelegation()
    await delegations.putMany(ucan1)
    const listResult = await r2.list()
    assert.deepEqual(listResult.objects.length, 1)
    const r2KeyString = listResult.objects[0].key
    const r2KeyMatch = r2KeyString.match(/^\/delegations\/(.+)\.car$/)
    assert.ok(r2KeyMatch)
    const r2KeyCidString = r2KeyMatch[1]

    assert.deepEqual(
      r2KeyCidString[0],
      multibasePrefixes[expectMultibase],
      `r2 key cid string uses multibase ${expectMultibase}`
    )
    const r2KeyCid = CID.parse(r2KeyCidString)

    assert.deepEqual(r2KeyCid.version, 1)
    assert.deepEqual(r2KeyCid.code, ucanto.UCAN.code)
    assert.deepEqual(
      r2KeyCid.multihash.code,
      expectMultihash,
      `keyCid multihash code is ${expectMultihash}`
    )

    // d1 cid column
    const delegationsFromD1 = await d1
      .prepare(`select cid from delegations_v3`)
      .all()
    assert.equal(delegationsFromD1.results?.length, 1)
    const d1CidString = /** @type {{cid:string}} */ (
      delegationsFromD1.results?.[0]
    ).cid
    assert.deepEqual(
      d1CidString[0],
      multibasePrefixes[expectMultibase],
      `d1 cid column uses multibase ${expectMultibase}`
    )
    const d1Cid = CID.parse(d1CidString)
    assert.deepEqual(d1Cid.version, 1)
    assert.deepEqual(d1Cid.code, ucanto.UCAN.code)
    assert.deepEqual(
      d1Cid.multihash.code,
      expectMultihash,
      `d1Cid multihash code is ${expectMultihash}`
    )
  })
}
