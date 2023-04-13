/**
 * write to stdout the value to use for the sentry release
 */
/* eslint-disable no-console */
/* eslint-disable unicorn/prefer-module */

/**
 * Create a string to be used for the sentry release value
 * 
 * @param {object} pkg 
 * @param {string} pkg.name
 * @param {string} pkg.version
 * @param {string} env 
 * @param {string} gitShort - git.short(__dirname)
 * @returns {string}
 */
export function createSentryRelease(
  pkg,
  env,
  gitShort,
) {
  const version = `${pkg.name}@${pkg.version}-${env}+${gitShort}`.replace('/', '__')
  return version
}
