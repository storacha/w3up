import * as Server from '@ucanto/server'

export const StorageOperationErrorName = /** @type {const} */ (
  'StorageOperationFailed'
)
export class StorageOperationFailed extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return StorageOperationErrorName
  }
}

export const RecordKeyConflictName = /** @type {const} */ ('RecordKeyConflict')
export class RecordKeyConflict extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return RecordKeyConflictName
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
