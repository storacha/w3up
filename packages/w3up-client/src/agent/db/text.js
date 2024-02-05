import { glob, like, Constraint, API as DB } from 'datalogia'
import * as API from '../../types.js'

/**
 * Creates a clause that matches `source` only if it satisfies given
 * `pattern`.
 *
 * @param {DB.Term<string>} source
 * @param {API.TextConstraint} pattern
 */
export const match = (source, pattern) =>
  pattern.glob != null
    ? glob(source, pattern.glob)
    : pattern.like != null
    ? like(source, pattern.like)
    : pattern['='] != null
    ? Constraint.is(source, pattern['='])
    : Constraint.is(source, pattern)
