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

export const RecordNotFoundErrorName = /** @type {const} */ ('RecordNotFound')
export class RecordNotFound extends Server.Failure {
  get reason() {
    return this.message
  }

  describe() {
    return `Record not found`
  }

  get name() {
    return RecordNotFoundErrorName
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

export const BlobNotFoundErrorName = /** @type {const} */ ('BlobNotFound')
export class BlobNotFound extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return BlobNotFoundErrorName
  }
}

export const ComputePieceErrorName = /** @type {const} */ ('ComputePieceFailed')
export class ComputePieceFailed extends Error {
  get reason() {
    return this.message
  }

  get name() {
    return ComputePieceErrorName
  }
}

export const UnexpectedPieceErrorName = /** @type {const} */ ('UnexpectedPiece')
export class UnexpectedPiece extends Error {
  get reason() {
    return this.message
  }

  get name() {
    return UnexpectedPieceErrorName
  }
}

export const UnsupportedCapabilityErrorName = /** @type {const} */ ('UnsupportedCapability')
export class UnsupportedCapability extends Server.Failure {
  /**
   * @param {object} source
   * @param {import('@ucanto/interface').Capability} source.capability
   */
  constructor({ capability: { with: subject, can } }) {
    super()

    this.capability = { with: subject, can }
  }
  get name() {
    return UnsupportedCapabilityErrorName
  }
  describe() {
    return `${this.capability.with} does not have a "${this.capability.can}" capability provider`
  }
}
