import { capability, ok, Schema } from '@ucanto/validator'
import { and, equal, equalWith, SpaceDID } from './utils.js'

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * be derived any `usage/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const usage = capability({
  can: 'usage/*',
  /** DID of the (memory) space where usage is derived. */
  with: SpaceDID,
  derives: equalWith,
})

/**
 * Capability can be invoked by an agent to retrieve usage data for a space in
 * a given period.
 */
export const report = capability({
  can: 'usage/report',
  with: SpaceDID,
  nb: Schema.struct({
    /** Period to retrieve events between. */
    period: Schema.struct({
      /** Time in seconds after Unix epoch (inclusive). */
      from: Schema.integer().greaterThan(-1),
      /** Time in seconds after Unix epoch (exclusive). */
      to: Schema.integer().greaterThan(-1),
    }),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(
        equal(child.nb.period?.from, parent.nb.period?.from, 'period.from')
      ) ||
      and(equal(child.nb.period?.to, parent.nb.period?.to, 'period.to')) ||
      ok({})
    )
  },
})
