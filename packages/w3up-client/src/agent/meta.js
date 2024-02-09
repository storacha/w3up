import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Text from './db/text.js'

/**
 * @param {DB.Term<DB.Entity>} meta
 * @param {Record<string, DB.Term>} constraints
 */
export const match = (meta, constraints) =>
  DB.and(
    ...Object.entries(constraints).map(([key, value]) =>
      DB.match([meta, key, value])
    )
  )
