import * as DB from 'datalogia'
import { isLink } from '@ucanto/core'

/**
 * Derives facts from the given `source` object. For each scalar value in the
 * object it produces [entity, [...path, key].join('/'), value] triple and
 * for non scalar value it descends and produces [entity, [...path, key, nestedKey].join('/'), value] triples.
 *
 * If `options.entity` is provided asserts facts about it, otherwise derives
 * a new entity from the `source` object. If `options.path` is provided it is
 * used as a prefix for the path of the facts.
 *
 * @param {{}} source
 * @param {object} options
 * @param {string[]} [options.path]
 * @param {DB.Entity} [options.entity]
 * @returns {Iterable<DB.Fact>}
 */
export const assert = function* (
  source,
  { entity = DB.Memory.entity(source), path = [] } = {}
) {
  for (const [key, value] of Object.entries(source)) {
    switch (typeof value) {
      case 'number':
      case 'bigint':
      case 'string':
      case 'boolean':
        yield [entity, [...path, key].join('/'), value]
        break
      case 'object': {
        if (isLink(value)) {
          yield [entity, [...path, key].join('/'), value]
        } else if (value) {
          yield* assert(value, { entity, path: [...path, key] })
        }
        break
      }
    }
  }
}
