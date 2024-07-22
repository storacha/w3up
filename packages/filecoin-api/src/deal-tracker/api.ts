import type { Signer } from '@ucanto/interface'
import { PieceLink } from '@web3-storage/data-segment'
import { Store, QueryableStore } from '../types.js'

export type DealStore = Store<DealRecordKey, DealRecord> &
  QueryableStore<DealRecordQueryByPiece, DealRecord>

export interface ServiceContext {
  /**
   * Service signer
   */
  id: Signer

  /**
   * Stores information about deals for a given aggregate piece CID.
   */
  dealStore: DealStore
}

export interface DealRecord {
  // PieceCid of an Aggregate `bagy...aggregate`
  piece: PieceLink
  // address of the Filecoin storage provider storing deal
  provider: string
  // deal identifier
  dealId: number
  // epoch of deal expiration
  expirationEpoch: number
  // source of the deal information
  source: string
  // Date when deal was added as ISO string
  insertedAt: string
}

export interface DealRecordKey extends Pick<DealRecord, 'piece' | 'dealId'> {}

export interface DealRecordQueryByPiece extends Pick<DealRecord, 'piece'> {}
