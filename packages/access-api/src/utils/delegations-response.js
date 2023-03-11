/**
 * test tools for encoding UCAN.Delegation
 * into ucanto responses.
 */

import * as Ucanto from '@ucanto/interface'
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
export function encode(delegations) {
  const entries = [...delegations].map((d) => {
    return /** @type {const} */ ([d.cid.toString(), delegationsToBytes([d])])
  })
  return Object.fromEntries(entries)
}

/**
 * @param {DictCidToCarBytes<Ucanto.Delegation>} encoded
 * @returns {Iterable<Ucanto.Delegation>}
 */
export function* decode(encoded) {
  for (const carBytes of Object.values(encoded)) {
    const delegations = bytesToDelegations(
      /** @type {import('@web3-storage/access/src/types.js').BytesDelegation<Ucanto.Capabilities>} */ (
        carBytes
      )
    )
    yield* delegations
  }
}
