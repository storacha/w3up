/**
 * test tools for encoding UCAN.Delegation
 * into ucanto responses.
 */

import * as Ucanto from '@ucanto/interface'
import { createSampleDelegation } from '../src/utils/ucan.js'
import * as assert from 'node:assert'
import {
  bytesToDelegations,
  delegationsToBytes,
} from '@web3-storage/access/encoding'

/**
 * @template D
 * @typedef {Record<string,Ucanto.ByteView<D>>} DictCidToCarBytes
 */

/**
 * encode a set of delegations into a format suitable for a ucanto response.
 * the ucanto response is likely going to be encoded to CBOR.
 * encode the set to a dict, where keys are a CIDs of the delegation, and
 *
 * @template {Ucanto.Capabilities} Capabilities
 * @param {Iterable<Ucanto.Delegation<Capabilities>>} delegations
 * @returns {DictCidToCarBytes<Ucanto.Delegation<Capabilities>>}
 */
function encode(delegations) {
  const entries = [...delegations].map((d) => {
    return /** @type {const} */ ([d.cid.toString(), delegationsToBytes([d])])
  })
  return Object.fromEntries(entries)
}

/**
 * @param {DictCidToCarBytes<Ucanto.Delegation>} encoded
 * @returns {Iterable<Ucanto.Delegation>}
 */
function* decode(encoded) {
  for (const carBytes of Object.values(encoded)) {
    const delegations = bytesToDelegations(
      /** @type {import('@web3-storage/access/src/types.js').BytesDelegation<Ucanto.Capabilities>} */ (
        carBytes
      )
    )
    yield* delegations
  }
}

it('can encode delegations set to dict', async () => {
  const delegations = [
    ...(await createSampleDelegations(Math.ceil(3 * Math.random()))),
  ]
  const delegationsCidStrings = new Set(delegations.map((d) => String(d.cid)))
  const encoded = await encode(delegations)
  assert.deepEqual(
    Object.entries(encoded).length,
    delegations.length,
    'encoded has one entry for each delegation'
  )
  for (const value of Object.values(encoded)) {
    const decodedDelegations = bytesToDelegations(
      /** @type {import('@web3-storage/access/src/types.js').BytesDelegation<Ucanto.Capabilities>} */ (
        value
      )
    )
    assert.deepEqual(decodedDelegations.length, 1, 'decodedValue has one entry')
    const [delegation] = decodedDelegations
    assert.ok(
      delegationsCidStrings.has(delegation.cid.toString()),
      'decoded delegations entry has same cid as original'
    )
  }
})

it('can decode delegations dict back to set', async () => {
  const delegations = [
    ...(await createSampleDelegations(Math.ceil(3 * Math.random()))),
  ]
  const delegationsCidStrings = new Set(delegations.map((d) => String(d.cid)))
  const encoded = await encode(delegations)
  const decoded = [...decode(encoded)]
  const decodedCidStrings = new Set(decoded.map((d) => String(d.cid)))
  assert.deepEqual(
    [...delegationsCidStrings],
    [...decodedCidStrings],
    'decoded has same cids as original'
  )
})

async function createSampleDelegations(length = 3) {
  const delegations = await Promise.all(
    Array.from({ length }).map(() => createSampleDelegation())
  )
  return delegations
}
