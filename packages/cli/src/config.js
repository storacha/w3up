import fs from 'fs'

export const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

export const NAME = pkg.name.split('/').pop()
