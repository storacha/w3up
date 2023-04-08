#!/usr/bin/env -S node --experimental-vm-modules --no-warnings
/* eslint-disable no-console */
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'
import sade from 'sade'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'
import Sentry from '@sentry/cli'
import { createRequire } from 'module'
import { Log, LogLevel, Miniflare } from 'miniflare'

// @ts-ignore
import git from 'git-rev-sync'
import { migrate } from './migrate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const prog = sade('api')

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '.env'),
})

const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
)

/** @type {import('esbuild').Plugin} */
const PluginAlias = {
  name: 'alias',
  setup(build) {
    build.onResolve({ filter: /^stream$/ }, () => {
      return { path: require.resolve('readable-stream') }
    })

    build.onResolve({ filter: /^node-fetch$/ }, () => {
      return { path: path.resolve(__dirname, 'fetch.js') }
    })
    build.onResolve({ filter: /^cross-fetch$/ }, () => {
      return { path: path.resolve(__dirname, 'fetch.js') }
    })
  },
}
prog
  .command('build')
  .describe('Build the worker.')
  .option('--env', 'Environment', 'dev')
  .action(async (opts) => {
    try {
      const version = `${pkg.name}@${pkg.version}-${opts.env}+${git.short(
        __dirname
      )}`.replace('/', '__')
      await build({
        entryPoints: [path.join(__dirname, '../src/index.js')],
        bundle: true,
        format: 'esm',
        outfile: 'dist/worker.js',
        legalComments: 'external',
        inject: [path.join(__dirname, 'node-globals.js')],
        plugins: [PluginAlias],
        define: {
          ACCOUNT_VERSION: JSON.stringify(version),
          ACCOUNT_COMMITHASH: JSON.stringify(git.long(__dirname)),
          ACCOUNT_BRANCH: JSON.stringify(git.branch(__dirname)),
          global: 'globalThis',
        },
        minify: opts.env !== 'dev',
        sourcemap: 'external',
        jsxImportSource: 'preact',
        jsx: 'automatic',
        loader: { '.js': 'jsx' },
      })

      // Sentry release and sourcemap upload
      if (process.env.SENTRY_UPLOAD === 'true') {
        const cli = new Sentry(undefined, {
          authToken: process.env.SENTRY_TOKEN,
          org: 'protocol-labs-it',
          project: 'w3access-api',
          // @ts-ignore
          dist: git.short(__dirname),
        })

        await cli.releases.new(version)
        await cli.releases.setCommits(version, {
          auto: true,
          ignoreEmpty: true,
          ignoreMissing: true,
        })
        await cli.releases.uploadSourceMaps(version, {
          include: ['./dist'],
          urlPrefix: '/',
        })
        await cli.releases.finalize(version)
        await cli.releases.newDeploy(version, {
          env: opts.env,
        })
      }
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })

prog
  .command('dev')
  .describe('Start dev server.')
  .action(async () => {
    const mf = new Miniflare({
      packagePath: true,
      wranglerConfigPath: true,
      sourceMap: true,
      modules: true,
      watch: true,
      envPath: path.resolve(__dirname, '../../../.env'),
      log: new Log(LogLevel.DEBUG), // Enable --debug messages
    })

    const server = await mf.createServer() // Create http.Server instance
    server.listen(8787, async () => {
      const binds = await mf.getBindings()
      const db = /** @type {D1Database} */ (binds.__D1_BETA__)
      await migrate(db)
      console.log('⚡️ Server listening on http://localhost:8787')
    })
  })
prog.parse(process.argv)
