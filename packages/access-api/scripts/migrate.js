import split from '@databases/split-sql-query'
import sql from '@databases/sql'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@databases/sql').FormatConfig} */
const sqliteFormat = {
  escapeIdentifier: (_) => '',
  formatValue: (_, __) => ({ placeholder: '', value: '' }),
}

// const files = globbySync(`${__dirname}/../migrations/*`)
const dir = path.resolve(`${__dirname}/../migrations`)

const files = fs.readdirSync(dir)
const migrations = files.map((f) => sql.file(path.join(dir, f)))

/**
 * Migrate from migration files
 *
 * @param {D1Database} db
 */
export async function migrate(db) {
  const appliedMigrations = /** @type {number} */ (
    await db.prepare('PRAGMA user_version').first('user_version')
  )

  migrations.splice(0, appliedMigrations)
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
      .prepare(`PRAGMA user_version = ${appliedMigrations + remaining}`)
      .all()
  }
}
