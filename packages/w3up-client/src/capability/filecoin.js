import { Storefront } from '@storacha/filecoin-client'
import { Filecoin as FilecoinCapabilities } from '@storacha/capabilities'
import { Base } from '../base.js'

/**
 * Client for interacting with the `filecoin/*` capabilities.
 */
export class FilecoinClient extends Base {
  /**
   * Offer a Filecoin "piece" to the resource.
   *
   * Required delegated capabilities:
   * - `filecoin/offer`
   *
   * @param {import('multiformats').UnknownLink} content
   * @param {import('@storacha/capabilities/types').PieceLink} piece
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
   * Required delegated capabilities:
   * - `filecoin/info`
   *
   * @param {import('@storacha/capabilities/types').PieceLink} piece
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
