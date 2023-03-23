import { ColumnType, Generated } from 'kysely'

export { R2Bucket } from '@miniflare/r2'

// v3
// * dropped 'bytes' column in favor of storing them in R2 (see DbDelegationsStorageWithR2)

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
