import { Storefront } from '@web3-storage/filecoin-client'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `filecoin/*` capabilities.
 */
export class FilecoinClient extends Base {
  /**
   * Offer a Filecoin "piece" to the resource.
   *
   * @param {import('multiformats').UnknownLink} content
   * @param {import('@web3-storage/capabilities/types').PieceLink} piece
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async offer(content, piece, options) {
    const conf = await this._invocationConfig([FilecoinCapabilities.offer.can])
    return Storefront.filecoinOffer(conf, content, piece, {
      ...options,
      connection: this._serviceConf.filecoin,
    })
  }

  /**
   * Request info about a content piece in Filecoin deals
   *
   * @param {import('@web3-storage/capabilities/types').PieceLink} piece
   * @param {object} [options]
   * @param {string} [options.nonce]
   */
  async info(piece, options) {
    const conf = await this._invocationConfig([FilecoinCapabilities.info.can])
    return Storefront.filecoinInfo(conf, piece, {
      ...options,
      connection: this._serviceConf.filecoin,
    })
  }
}
