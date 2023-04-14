import { capability, Schema } from '@ucanto/server'

/**
 * @see JMAP generic /set https://www.rfc-editor.org/rfc/rfc8620.html#section-5.3
 */
export const set = capability({
  can: 'claims/set',
  with: Schema.did(),
  nb: Schema.struct({}),
})

export default { set }
