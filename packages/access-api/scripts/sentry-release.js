/* eslint-disable no-console */
/* eslint-disable unicorn/prefer-module */
/**
 * write to stdout the value to use for the sentry release
 */

// @ts-ignore
import git from 'git-rev-sync'
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'
import sade from 'sade'
import * as url from 'node:url';
import { createSentryRelease } from '../src/utils/sentry.js'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main().catch(error => { throw error })
  }
}

async function main(argv=process.argv) {
  sade('sentry-release')
    .command('print-release-name', '', { default: true })
    .option('--env', 'Environment')
    .action((opts) => {
      if ( ! opts.env) {
        throw new Error('provide --env option')
      }
      const packageJson = JSON.parse(
        // eslint-disable-next-line unicorn/prefer-json-parse-buffer
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
      )
      const releaseString = createSentryRelease(
        packageJson,
        opts.env,
        git.short(__dirname),
      )
      console.log(releaseString)
    })
    .parse(argv)
}
