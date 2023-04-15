import { Schema } from '@ucanto/server'

export const descriptor = {
  with: Schema.did(),
  nb: Schema.struct({}),
}

export const invoke = async () => {
  return {
    ok: {
      status: 200,
    },
  }
}

export default {
  descriptor,
  invoke,
}
