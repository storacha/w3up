import { capability, Schema } from '@ucanto/validator'
import { equalWith } from './utils.js'

export const console = capability({
  can: 'console/*',
  with: Schema.did(),
  derives: equalWith,
})

/**
 * Capability that succeeds with the `nb.value` value.
 */
export const log = capability({
  can: 'console/log',
  with: Schema.did(),
  nb: Schema.struct({
    value: Schema.unknown(),
  }),
  derives: equalWith,
})

/**
 * Capability that fails with an error provided to `nb.error` field.
 */
export const error = capability({
  can: 'console/error',
  with: Schema.did(),
  nb: Schema.struct({
    error: Schema.unknown(),
  }),
  derives: equalWith,
})
