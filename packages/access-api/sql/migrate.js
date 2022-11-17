import { escapeSQLiteIdentifier } from '@databases/escape-identifier'
import sql from '@databases/sql'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@databases/sql').FormatConfig} */
const sqliteFormat = {
  escapeIdentifier: (str) => escapeSQLiteIdentifier(str),
  formatValue: (value) => ({ placeholder: '?', value }),
}

const migrations = [sql.file(`${__dirname}/tables.sql`)]

/**
 * Probably should batch queries and use https://www.atdatabases.org/docs/split-sql-query to split inlined queries
 *
 * @see https://docs.google.com/document/d/1QpUryGBWaGbAIjkw2URwpV6Btp5S-XQVkBJJs85dLRc/edit#
 *
 * @param {D1Database} db
 */
export async function migrate(db) {
  try {
    for (const m of migrations) {
      await db.exec(m.format(sqliteFormat).text.replace(/\n/g, ''))
    }
  } catch (error) {
    const err = /** @type {Error} */ (error)
    // eslint-disable-next-line no-console
    console.error('D1 Error', {
      message: err.message,
      // @ts-ignore
      cause: err.cause?.message,
    })
  }
}
