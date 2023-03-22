import { URI } from '@ucanto/interface'
import { ColumnType, Generated } from 'kysely'

export { R2Bucket } from '@miniflare/r2'

// v2

/**
 * @deprecated - use DelegationsV3Row
 */
export interface DelegationsV2Row {
  cid: string
  bytes: Uint8Array | number[]
  audience: URI<'did:'>
  issuer: URI<'did:'>
  expires_at: Date | null
  inserted_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>
}

/**
 * @deprecated - use DelegationsV3Tables
 */
export interface DelegationsV2Tables {
  delegations_v2: DelegationsV2Row
}

// v3
// * drop 'bytes' column in favor of storing them in R2 (see DbDelegationsStorageWithR2)

export interface DelegationsV3Row {
  cid: string
  audience: `did:${string}`
  issuer: `did:${string}`
  expires_at: Date | null
  inserted_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>
}

export interface DelegationsV3Tables {
  delegations_v3: DelegationsV3Row
}
