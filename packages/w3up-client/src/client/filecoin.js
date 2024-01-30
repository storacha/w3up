import { Storefront } from '@web3-storage/filecoin-client'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'
import { Client } from './client.js'
import * as API from '../types.js'

/**
 * Client for interacting with the `filecoin/*` capabilities.
 *
 * @extends {Client<API.StorefrontService>}
 */
export class FilecoinClient extends Client {
  /**
   * Offer a Filecoin "piece" to the resource.
   *
   * @param {API.UnknownLink} content
   * @param {API.PieceLink} piece
   */
  async offer(content, piece) {
    const conf = await this._invocationConfig([FilecoinCapabilities.offer.can])
    return Storefront.filecoinOffer(conf, content, piece, this.agent)
  }

  /**
   * Request info about a content piece in Filecoin deals
   *
   * @param {import('@web3-storage/capabilities/types').PieceLink} piece
   */
  async info(piece, options = {}) {
    const conf = await this._invocationConfig([FilecoinCapabilities.info.can])
    return Storefront.filecoinInfo(conf, piece, {
      connection: this.agent.connection,
      ...options,
    })
  }
}
