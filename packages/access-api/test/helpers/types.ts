import type * as Ucanto from '@ucanto/interface'
import type { Miniflare } from 'miniflare'

export interface HelperTestContext<Service extends Record<string, any>> {
  issuer: Ucanto.Signer<Ucanto.DID<'key'>>
  service: Ucanto.Signer<Ucanto.DID<'web'>>
  conn: Ucanto.ConnectionView<Service>
  mf: Miniflare
}
