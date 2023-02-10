import { Kysely } from 'kysely'

export type Database<Tables> = Kysely<Tables> & {
  /**
   * whether or not this Databse supports Kysely stream() asyncIterator
   * (kysely-d1 dialect does not)
   */
  canStream: boolean
}
