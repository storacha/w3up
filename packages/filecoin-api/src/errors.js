import * as Server from '@ucanto/server'

export const UnexpectedStateErrorName = /** @type {const} */ ('UnexpectedState')
export class UnexpectedState extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return UnexpectedStateErrorName
  }
}

export const QueueOperationErrorName = /** @type {const} */ (
  'QueueOperationFailed'
)
export class QueueOperationFailed extends Server.Failure {
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
  get reason() {
    return this.message
  }

  get name() {
    return StoreOperationErrorName
  }
}

export const StoreNotFoundErrorName = /** @type {const} */ ('StoreNotFound')
export class StoreNotFound extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return StoreNotFoundErrorName
  }
}

export const EncodeRecordErrorName = /** @type {const} */ ('EncodeRecordFailed')
export class EncodeRecordFailed extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return EncodeRecordErrorName
  }
}

export const DecodeBlockOperationErrorName = /** @type {const} */ (
  'DecodeBlockOperationFailed'
)
export class DecodeBlockOperationFailed extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return DecodeBlockOperationErrorName
  }
}
