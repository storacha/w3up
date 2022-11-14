import fs from 'fs'

export const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

export const NAME = pkg.name.split('/').pop()

export const SERVICE_URL = new URL(process.env.SERVICE_URL ?? 'https://w3access-staging.protocol-labs.workers.dev')
