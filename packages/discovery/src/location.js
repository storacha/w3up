import { Schema, provide, capability as createCapability } from '@ucanto/server'

/**
 * location claim
 */
export const capability = createCapability({
  can: 'discovery/assert/location',
  with: Schema.did(),
  nb: Schema.struct({}),
})

export const invoke = async () => {
  return {
    ok: {},
  }
}

export const provider = provide(capability, invoke)

export default { provider }
