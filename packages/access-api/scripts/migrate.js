// import { escapeSQLiteIdentifier } from '@databases/escape-identifier'
import split from '@databases/split-sql-query'
import sql from '@databases/sql'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@databases/sql').FormatConfig} */
const sqliteFormat = {
  // escapeIdentifier: (str) => escapeSQLiteIdentifier(str),
  // formatValue: (value) => ({ placeholder: '?', value }),

  escapeIdentifier: (_) => '',
  formatValue: (_, __) => ({ placeholder: '', value: '' }),
}
const migrations = [
  sql.file(`${__dirname}/../migrations/0000_create_spaces_table.sql`),
]

/**
 * Migrate from migration files
 *
 * @param {D1Database} db
 */
export async function migrate(db) {
  try {
    for (const m of migrations) {
      /** @type {import('@databases/sql').SQLQuery[]} */
      // @ts-ignore
      const qs = split.default(m)
      await db.batch(
        qs.map((q) => {
          return db.prepare(q.format(sqliteFormat).text.replace(/^--.*$/gm, ''))
        })
      )
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
