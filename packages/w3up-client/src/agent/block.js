import * as API from '../types.js'
import { parseLink } from '@ucanto/core'

/**
 * An {@link API.IPLDBlock} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 *
 * @typedef {object} Archive
 * @property {API.CIDString} cid
 * @property {Uint8Array} bytes
 */

/**
 * Formats {@link API.IPLDBlock} into {@link Archive}.
 *
 * @param {API.IPLDBlock} block
 * @returns {Archive}
 */
export const toArchive = ({ cid, bytes }) => ({
  cid: `${cid}`,
  bytes,
})

/**
 * Formats {@link Archive} into {@link API.IPLDBlock}.
 *
 * @param {Archive} archive
 * @returns {API.IPLDBlock}
 */
export const fromArchive = ({ cid, bytes }) => ({
  cid: parseLink(cid).toV1(),
  bytes,
})
