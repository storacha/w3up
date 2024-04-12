import * as Server from '@ucanto/server'

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

  get name() {
    return RecordNotFoundErrorName
  }
}
