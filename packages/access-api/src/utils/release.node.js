/**
 * @file
 * utils related to sentry that rely on node.
 * These might be used at build time,
 * but won't work at run-time in cloudflare workers
 */
/* eslint-disable no-console */
/* eslint-disable unicorn/prefer-module */

// @ts-ignore
import git from 'git-rev-sync'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'node:module'

const packageJson = createRequire(import.meta.url)('../../package.json')
const __dirname = () => path.dirname(fileURLToPath(import.meta.url))

/**
 * Create a string to be used for the sentry release value
 *
 * @param {string} [env] - environment name e.g. 'dev'
 * @param {object} pkg - package.json info
 * @param {string} pkg.name
 * @param {string} pkg.version
 * @param {string} gitShort - git-rev-parse short value
 * @returns {string} release name e.g. `@web3-storage__access-api@6.0.0-staging+92a89d3`
 */
export function getReleaseName(
  env,
  pkg = packageJson,
  gitShort = git.short(__dirname())
) {
  const version = `${pkg.name}@${pkg.version}-${env}+${gitShort}`.replace(
    '/',
    '__'
  )
  return version
}
