import { URI } from '@ucanto/interface'
import { ColumnType, Generated } from 'kysely'

// v2

export interface DelegationsV2Table {
  cid: string
  bytes: Uint8Array
  audience: URI<'did:'>
  issuer: URI<'did:'>
  expires_at: Date | null
  inserted_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>
}

export interface AccessApiD1TablesV2 {
  delegations_v2: DelegationsV2Table
}

// v3

export interface DelegationsV3Table {
  cid: string
  audience: `did:${string}`
  issuer: `did:${string}`
  expires_at: Date | null
  inserted_at: Generated<Date>
  updated_at: ColumnType<Date, never, Date>
}

export interface AccessApiD1TablesV3 {
  delegations_v3: DelegationsV3Table
}
