import { Schema, capability, DID, Failure } from '@ucanto/validator'

export { Schema, capability, DID, Failure }

export const {
  literal,
  struct,
  dictionary,
  link,
  did,
  string,
  array,
  boolean,
  unknown,
} = Schema

export const Bytes = unknown().refine({
  /**
   * @param {unknown} value
   */
  read(value) {
    return value instanceof Uint8Array
      ? value
      : Schema.typeError({
          expect: 'Uint8Array',
          actual: value,
        })
  },
})

export const Space = DID.match({ method: 'key' })
export const Account = DID.match({ method: 'mailto' })
export const Agent = Schema.did()

/**
 * We do not limit provider to a specific DID, because we want to allow it to
 * be different per in dev, staging and prod.
 */
export const Provider = DID.match({ method: 'web' })

export const Order = Schema.link({ version: 1 })

export const Ability = Schema.string()
