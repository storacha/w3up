import * as Server from '@ucanto/server'

export const QueueOperationErrorName = /** @type {const} */ (
  'QueueOperationFailed'
)
export class QueueOperationFailed extends Server.Failure {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
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
   */
  constructor(message) {
    super(message)
  }
  get reason() {
    return this.message
  }
  get name() {
    return StoreOperationErrorName
  }
}

export const StoreNotFoundErrorName = /** @type {const} */ (
  'StoreNotFound'
)
export class StoreNotFound extends Server.Failure {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
  }
  get reason() {
    return this.message
  }
  get name() {
    return StoreNotFoundErrorName
  }
}

export const DecodeBlockOperationErrorName = /** @type {const} */ (
  'DecodeBlockOperationFailed'
)
export class DecodeBlockOperationFailed extends Server.Failure {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
  }
  get reason() {
    return this.message
  }
  get name() {
    return DecodeBlockOperationErrorName
  }
}
