import * as Server from '@ucanto/server'

export const OperationErrorName = /** @type {const} */ ('OperationFailed')
export class OperationFailed extends Server.Failure {
  /**
   * @param {string} message
   * @param {import('@web3-storage/data-segment').PieceLink} piece
   */
  constructor(message, piece) {
    super(message)
    this.piece = piece
  }

  get reason() {
    return this.message
  }

  get name() {
    return OperationErrorName
  }
}
