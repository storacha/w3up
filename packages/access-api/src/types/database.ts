import * as Kysely from 'kysely'

export type Database<Tables> = Kysely.Kysely<Tables> & {
  /**
   * whether or not this Database supports Kysely stream() asyncIterator
   * (kysely-d1 dialect does not)
   */
  canStream?: boolean
}

declare const column: unique symbol

export type Column<
  SelectType,
  InsertType = SelectType,
  UpdateType = InsertType
> = SelectType & {
  [column]?: Kysely.ColumnType<SelectType, InsertType, UpdateType>
}

export type Text<T> = Column<T, string>

export type Timestamp = Column<Date, never, Date>

export type Generated<T> = Column<T, T | undefined, T>

export interface Row {
  updated_at: Timestamp
  inserted_at: Timestamp
}

export type Table<Model> = {
  [Key in keyof Model]: Model[Key] extends Column<infer O, infer I, infer U>
    ? Kysely.ColumnType<O, I, U>
    : Model[Key]
}
