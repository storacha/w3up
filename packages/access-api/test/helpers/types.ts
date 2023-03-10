import type * as Ucanto from '@ucanto/interface'
import type { Miniflare } from 'miniflare'

export interface HelperTestContext {
  issuer: Ucanto.Signer<Ucanto.DID<'key'>>
  service: Ucanto.Signer<Ucanto.DID<'web'>>
  conn: Ucanto.ConnectionView<Record<string, any>>
  mf: Miniflare
}
