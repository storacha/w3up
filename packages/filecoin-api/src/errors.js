import * as Server from '@ucanto/server'

export const QueueOperationErrorName = /** @type {const} */ (
  'QueueOperationFailed'
)
export class QueueOperationFailed extends Server.Failure {
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
    return QueueOperationErrorName
  }
}

export const StoreOperationErrorName = /** @type {const} */ (
  'StoreOperationFailed'
)
export class StoreOperationFailed extends Server.Failure {
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
    return StoreOperationErrorName
  }
}

export const DecodeBlockOperationErrorName = /** @type {const} */ (
  'DecodeBlockOperationFailed'
)
export class DecodeBlockOperationFailed extends Server.Failure {
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
    return DecodeBlockOperationErrorName
  }
}
