/* eslint-disable unicorn/prefer-top-level-await */
/* eslint-disable no-console */
/* eslint-disable unicorn/prefer-module */
/**
 * @file
 * use this at build time (node.js) to create files that can be
 * imported at runtime (maybe workerd).
 */
import sade from 'sade'
import * as url from 'node:url'
import { getReleaseName } from '../src/utils/release.node.js'
import path from 'path'
import { fileURLToPath } from 'url'
// @ts-ignore
import git from 'git-rev-sync'

function __dirname() {
  return path.dirname(fileURLToPath(import.meta.url))
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url)
  if (process.argv[1] === modulePath) {
    main().catch((error) => {
      throw error
    })
  }
}

async function main(argv = process.argv) {
  const cli = sade('access-api-release')
  cli
    .command('name', '', { default: true })
    .option('--env', 'Environment', process.env.ENV)
    .action((opts) => {
      const releaseName = getReleaseName(opts.env)
      console.log(releaseName)
    })
  cli
    .command('esm', 'print release info as ES Module string')
    .option('--env', 'Environment', process.env.ENV)
    .action((opts) => {
      const lines = [
        `/** @type {string|undefined} */`,
        `export const gitRevShort = '${git.short(__dirname())}'`,
        `/** @type {string|undefined} */`,
        `export const name = '${getReleaseName(opts.env)}'`,
      ]
      console.log(lines.join('\n'))
    })
  cli.parse(argv)
}
