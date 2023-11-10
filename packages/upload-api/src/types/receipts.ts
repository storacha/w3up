import type {
  UnknownLink,
  Receipt,
  Result,
  Unit,
  Failure,
} from '@ucanto/interface'
import { UCANReceiptFailure } from '../types.js'

/**
 * Stores receipts for executed tasks.
 */
export interface ReceiptsStorage {
  /**
   * Gets a record from the store.
   */
  get: (key: UnknownLink) => Promise<Result<Receipt, UCANReceiptFailure>>
  /**
   * Puts a record into the store.
   */
  put: (receipt: Receipt) => Promise<Result<Unit, Failure>>
}
