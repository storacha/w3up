#!/usr/bin/env node
/* eslint-disable no-console */
import sade from 'sade'
import fs from 'fs'
import Conf from 'conf'
import ora from 'ora'
import * as Keypair from '@ucanto/authority'
import * as Access from './index.js'
import path from 'path'
import undici from 'undici'
import { Transform } from 'stream'
// @ts-ignore
import * as DID from '@ipld/dag-ucan/did'

const NAME = 'w3access'
const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(new URL('../package.json', import.meta.url), {
    encoding: 'utf8',
  })
)
const config = new Conf({
  projectName: NAME,
  projectSuffix: '',
})

const prog = sade(NAME)
const url = process.env.URL || 'http://127.0.0.1:8787'
const did = DID.parse(
  // @ts-ignore - https://github.com/ipld/js-dag-ucan/issues/49
  process.env.DID || 'did:key:z6MksafxoiEHyRF6RsorjrLrEyFQPFDdN6psxtAfEsRcvDqx'
)

prog.version(pkg.version)

prog
  .command('init')
  .describe('Create or save a keypair to the config.')
  .option('--force', 'Override config with new keypair.', false)
  .option('--private-key', 'Create new keypair with private key.')
  .action(async (opts) => {
    const spinner = ora('Creating new keypair').start()
    try {
      const privateKey = /** @type {string | undefined} */ (
        config.get('private-key')
      )

      // Save or override keypair
      if (opts['private-key']) {
        const kp = Keypair.parse(opts['private-key'])
        config.set('private-key', opts['private-key'])
        config.set('did', kp.did())
        spinner.succeed(`Keypair created and saved to ${config.path}`)
        return
      }

      // Create or override keypair
      if (opts.force || !privateKey) {
        const kp = await Keypair.SigningAuthority.generate()
        config.set('private-key', Keypair.format(kp))
        config.set('did', kp.did())
        spinner.succeed(`Keypair created and saved to ${config.path}`)
        return
      }

      if (privateKey) {
        spinner.succeed(
          `Your already have a private key in your config, use --force to override.`
        )
        return
      }
    } catch (error) {
      // @ts-ignore
      spinner.fail(error.message)
      console.error(error)
      process.exit(1)
    }
  })

prog
  .command('register')
  .describe("Register with the service using config's keypair.")
  .option('--url', 'Service URL.', url)
  .action(async (opts) => {
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} init"`
        )
        process.exit(1)
      }

      // @ts-ignore
      const issuer = Keypair.parse(config.get('private-key'))
      const url = new URL(opts.url)
      await Access.validate({
        audience: did,
        url,
        issuer,
        caveats: {
          as: 'mailto:hugo@dag.house',
        },
      })

      spinner.text = 'Waiting for email validation...'
      const proof = await Access.pullRegisterDelegation({
        issuer,
        url,
      })

      await Access.register({
        audience: did,
        url,
        issuer,
        proof,
      })

      spinner.succeed('Registration done.')
    } catch (error) {
      console.error(error)
      // @ts-ignore
      spinner.fail(error.message)
      process.exit(1)
    }
  })

prog
  .command('upload <file>')
  .describe("Register with the service using config's keypair.")
  .option('--url', 'Service URL.', url)
  .action(async (file, opts) => {
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} init"`
        )
        process.exit(1)
      }

      // @ts-ignore
      const url = new URL(opts.url)

      const stream = fs.createReadStream(path.resolve(file))
      const checkStream = new Transform({
        transform(chunk, encoding, callback) {
          console.log(chunk.length)
          callback(undefined, chunk)
        },
      })

      const rsp = await undici.fetch(`${url}upload`, {
        body: stream.pipe(checkStream),
        method: 'POST',
      })

      console.log(await rsp.text())

      spinner.succeed('Registration done.')
    } catch (error) {
      console.error(error)
      // @ts-ignore
      spinner.fail(error.message)
      process.exit(1)
    }
  })

prog
  .command('config')
  .describe('Print config file content.')
  .action(async () => {
    console.log(config.path)
    try {
      for (const [key, value] of config) {
        console.log(`${key}: ${value}`)
      }
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })

prog.parse(process.argv)
