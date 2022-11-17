import fs from 'fs'
import Conf from 'conf'

export const NAME = 'w3access'
export const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(new URL('../../package.json', import.meta.url), {
    encoding: 'utf8',
  })
)

/**
 * @param {string} profile
 */
export function getConfig(profile = 'main') {
  const config = new Conf({
    projectName: NAME,
    projectSuffix: '',
    configName: profile,
  })
  return config
}
