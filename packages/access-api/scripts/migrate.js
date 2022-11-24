import split from '@databases/split-sql-query'
import sql from '@databases/sql'
import path from 'path'
import { fileURLToPath } from 'url'
import { globbySync } from 'globby'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@databases/sql').FormatConfig} */
const sqliteFormat = {
  escapeIdentifier: (_) => '',
  formatValue: (_, __) => ({ placeholder: '', value: '' }),
}

const files = globbySync(`${__dirname}/../migrations/*`)
const migrations = files.map((f) => sql.file(f))

/**
 * Migrate from migration files
 *
 * @param {D1Database} db
 */
export async function migrate(db) {
  const runnedMigrations = /** @type {number} */ (
    await db.prepare('PRAGMA user_version').first('user_version')
  )

  migrations.splice(0, runnedMigrations)
  const remaining = migrations.length
  for (const m of migrations) {
    /** @type {import('@databases/sql').SQLQuery[]} */
    // @ts-ignore
    const qs = split.default(m)
    await db.batch(
      qs.map((q) => {
        return db.prepare(q.format(sqliteFormat).text.replace(/^--.*$/gm, ''))
      })
    )

    await db
      .prepare(`PRAGMA user_version = ${runnedMigrations + remaining}`)
      .all()
  }
}
