import { Schema } from '@ucanto/validator'

/**
 * @see https://github.com/filecoin-project/FIPs/pull/758/files
 */
const FR32_SHA2_256_TRUNC254_PADDED_BINARY_TREE = /** @type {const} */ (0x1011)
/**
 * @see https://github.com/filecoin-project/FIPs/pull/758/files
 */
const RAW_CODE = /** @type {const} */ (0x55)

export const PieceLink = /** @type {import('../types.js').PieceLinkSchema} */ (
  Schema.link({
    code: RAW_CODE,
    version: 1,
    multihash: {
      code: FR32_SHA2_256_TRUNC254_PADDED_BINARY_TREE,
    },
  })
)
