import { Kysely } from 'kysely'

import type { ColumnType, Generated } from 'kysely'

export type Database<Tables> = Kysely<Tables> & {
  /**
   * whether or not this Databse supports Kysely stream() asyncIterator
   * (kysely-d1 dialect does not)
   */
  canStream: boolean
}

declare const Column: unique symbol

export type TextColumn<T> = T & {
  [Column]?: ColumnType<T, string, string>
}
// eslint-disable-next-line unicorn/prefer-export-from
export type { Generated }

export type Row<Model> = {
  [Key in keyof Model]: Model[Key] extends {
    [Column]?: ColumnType<infer O, infer I, infer U>
  }
    ? ColumnType<O, I, U>
    : Model[Key]
} & {
  inserted_at: ColumnType<Date, never, Date>
  updated_at: ColumnType<Date, never, Date>
}
