import { Kysely } from 'kysely'

export type Database<Tables> = Kysely<Tables>
