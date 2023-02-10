/**
 * test tools for encoding UCAN.Delegation
 * into ucanto responses.
 */

import * as UCAN from '@ipld/dag-ucan'
import * as Ucanto from '@ucanto/interface'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as assert from 'node:assert'
import { identity } from 'multiformats/hashes/identity'

/**
 * @typedef {Record<string,Ucanto.Link>} Encoded
 */

/**
 * encode a set of delegations into a format suitable for a ucanto response.
 * the ucanto response is likely going to be encoded to CBOR.
 * encode the set to a dict, where keys are a CIDs of the delegation, and
 *
 * @param {Iterable<Ucanto.Delegation>} delegations
 * @returns {Promise<Encoded>}
 */
async function encode(delegations) {
  const entries = await Promise.all(
    [...delegations].map(async (d) => {
      const identityLink = await UCAN.link(d.data, { hasher: identity })
      return /** @type {const} */ ([d.cid.toString(), identityLink])
    })
  )
  return Object.fromEntries(entries)
}

it('can encode delegations set to dict', async () => {
  const delegations = [
    ...(await createSampleDelegations(Math.ceil(3 * Math.random()))),
  ]
  const encoded = await encode(delegations)
  assert.deepEqual(
    Object.entries(encoded).length,
    delegations.length,
    'encoded has one entry for each delegation'
  )
  const ipldRawCode = 0x55
  for (const link of Object.values(encoded)) {
    assert.deepEqual(
      link.code,
      ipldRawCode,
      'encoded delegation CID should use raw code'
    )
  }
})

// @todo test can decoded Encoded back to Set<Delegations>

async function createSampleDelegations(length = 3) {
  const delegations = await Promise.all(
    Array.from({ length }).map(() => createSampleDelegation())
  )
  return delegations
}
