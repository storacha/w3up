/**
 * Deal signing capabilities used for signing filecoin deals.
 *
 * @see https://github.com/web3-storage/specs/blob/feat/w3-deal/w3-deal.md
 *
 * These can be imported directly with:
 * ```js
 * import * as Filecoin from '@web3-storage/capabilities/deal'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import * as API from '@ucanto/interface'
import { equal, equalWith, checkLink, and } from './utils.js'

/**
 * Payload size after 0-padding.
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/ff2ed169ff566458f2acd8b135d62e8ca27e7d0c/abi/piece.go#L12
 */
export const PaddedPieceSize = Schema.uint64()

/**
 * @see https://github.com/ipfs/go-cid/blob/829c826f6be23320846f4b7318aee4d17bf8e094/cid.go#L104
 * @type {API.MulticodecCode<0xf101, 'fil-commitment-unsealed'>}
 */
export const FilCommitmentUnsealed = 0xf101

/**
 * @see https://github.com/multiformats/go-multihash/blob/dc3bd6897fcd17f6acd8d4d6ffd2cea3d4d3ebeb/multihash.go#L73
 * @type {API.MulticodecCode<0x1012, 'sha2-256-trunc254-padded'>}
 */
export const Sha256Trunc254Padded = 0x1012

/**
 * Filecoin contracts use legacy Piece V1 CID links.
 */
export const PieceLinkV1 = Schema.link({
  version: 1,
  code: FilCommitmentUnsealed,
  multihash: {
    code: Sha256Trunc254Padded,
  },
})

/**
 *  An address in the filecoin network
 *
 * @see https://github.com/filecoin-project/go-address/blob/37ccdec47b76ea45424c7c9310e821cb224894e6/address.go#L39-L40
 */
export const Address = Schema.struct({
  addr: Schema.string(),
})

/**
 * Represents an arbitrary label of the deal either as string (in which case
 * `notString` is `false`) or as bytes (in which case `notString` is `true`).
 *
 * Empty value is represented as an empty string.
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/ff2ed169ff566458f2acd8b135d62e8ca27e7d0c/builtin/v9/market/deal.go#L36-L44
 */
export const DealLabel = Schema.struct({
  bs: Schema.bytes(),
  notString: Schema.boolean().default(false),
})

/**
 * Epoch number of the chain state
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/a154da53dfeff49744c94715f74d6edd54d2f6d2/abi/chain.go#L8-L10
 */
export const ChainEpoch = Schema.uint64()

/**
 * TokenAmount is an amount of Filecoin tokens serialized into a string.
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/a154da53dfeff49744c94715f74d6edd54d2f6d2/abi/chain.go#L22
 *
 * As far as I can tell reference implementation serializes / deserializes it
 * into a CBOR string.
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/a154da53dfeff49744c94715f74d6edd54d2f6d2/big/int.go#L278-L304
 *
 */
export const TokenAmount = Schema.string()

/**
 * Represents a deal proposal to be signed by the Storefront (`client` field)
 * which is an actor in the Filecoin network that compensates the storage
 * provider for storing the data.
 *
 * @see https://github.com/filecoin-project/go-state-types/blob/ff2ed169ff566458f2acd8b135d62e8ca27e7d0c/builtin/v9/market/deal.go#L201-L221
 */
export const Proposal = Schema.struct({
  Piece: PieceLinkV1,
  Size: PaddedPieceSize,
  VerifiedDeal: Schema.boolean(),
  Client: Address,
  Provider: Address,
  Label: DealLabel,

  StartEpoch: ChainEpoch,
  EndEpoch: ChainEpoch,

  StoragePricePerEpoch: TokenAmount,

  ProviderCollateral: TokenAmount,
  ClientCollateral: TokenAmount,
})

export const ProposalV2 = Schema.tuple([
  PieceLinkV1,
  PaddedPieceSize,
  Schema.boolean(),
  Address,
  Address,
  DealLabel,

  ChainEpoch,
  ChainEpoch,

  TokenAmount,

  TokenAmount,
  TokenAmount,
])

/**
 * The `deal/sign` capability allows actor with corresponding capability to sign
 * filecoin deals with the given storefront.
 */
export const sign = capability({
  can: 'deal/sign',
  /**
   * DID identifier of the storefront that will sign the deal.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Deal proposal to be signed by the storefront.
     */
    proposal: Proposal,
  }),
  derives: (claim, from) =>
    and(equalWith(claim, from)) ||
    // At the moment we simply check that the fields are equal. In the future
    // we might instead check that TokenAmounts are less than equal instead.
    and(
      checkLink(
        claim.nb.proposal.Piece,
        from.nb.proposal.Piece,
        'nb.proposal.Piece'
      )
    ) ||
    and(
      equal(claim.nb.proposal.Size, from.nb.proposal.Size, 'nb.proposal.Size')
    ) ||
    and(
      equal(
        claim.nb.proposal.VerifiedDeal,
        from.nb.proposal.VerifiedDeal,
        'nb.proposal.VerifiedDeal'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.Client.addr,
        from.nb.proposal.Client.addr,
        'nb.proposal.Client'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.Provider.addr,
        from.nb.proposal.Provider.addr,
        'nb.proposal.Provider'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.Label.notString,
        from.nb.proposal.Label.notString,
        'nb.proposal.Label'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.Label.notString,
        from.nb.proposal.Label.notString,
        'nb.proposal.Label.notString'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.Label.bs.join(''),
        from.nb.proposal.Label.bs.join(''),
        'nb.proposal.Label.notString'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.StartEpoch,
        from.nb.proposal.StartEpoch,
        'nb.proposal.StartEpoch'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.EndEpoch,
        from.nb.proposal.EndEpoch,
        'nb.proposal.EndEpoch'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.StoragePricePerEpoch,
        from.nb.proposal.StoragePricePerEpoch,
        'nb.proposal.StoragePricePerEpoch'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.ProviderCollateral,
        from.nb.proposal.ProviderCollateral,
        'nb.proposal.ProviderCollateral'
      )
    ) ||
    and(
      equal(
        claim.nb.proposal.ClientCollateral,
        from.nb.proposal.ClientCollateral,
        'nb.proposal.ClientCollateral'
      )
    ) ||
    ok({}),
})
