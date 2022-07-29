#!/usr/bin/env node
/* eslint-disable no-console */
import sade from 'sade'
import fs from 'fs'
import Conf from 'conf'
import ora from 'ora'
import * as Keypair from '@ucanto/authority'
import * as UCAN from '@ipld/dag-ucan'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import * as Access from './index.js'

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

/**
 * @param {string} jwtUCAN
 */
async function validate(jwtUCAN) {
  // @ts-ignore
  const ucan = UCAN.parse(jwtUCAN)

  await UCAN.verifySignature(ucan, Keypair.Authority.parse(ucan.issuer.did()))

  return ucan
}

const prog = sade(NAME)

prog.version(pkg.version)

prog
  .command('init')
  .describe('Create or save a keypair to the config.')
  .option('--force', 'Override config with new keypair.', false)
  .option('--private-key', 'Create new keypair with private key.')
  .option('--ucan', 'UCAN issued by the service to your DID.')
  .action(async (opts) => {
    const spinner = ora('Creating new keypair').start()
    try {
      const privateKey = /** @type {string | undefined} */ (
        config.get('private-key')
      )

      /**
       * @param {string} ucan
       * @param {import('@ucanto/interface').SigningAuthority} kp
       */
      async function validateAndSaveUcan(ucan, kp) {
        if (ucan) {
          const r = await validate(ucan)
          if (kp.did() !== r.audience.did()) {
            throw new Error('UCAN does not match keypair DID.')
          }
          config.set('ucan', ucan)
        }
      }

      // Save or override keypair
      if (opts['private-key']) {
        const kp = Keypair.parse(opts['private-key'])
        config.set('private-key', opts['private-key'])
        config.set('did', kp.did())
        await validateAndSaveUcan(opts.ucan, kp)
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
        await validateAndSaveUcan(opts.ucan, Keypair.parse(privateKey))
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
  .option('--name', 'Service name.', 'nft.storage')
  .option('--key', 'Service API key.', '')
  .action(async (opts) => {
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} keypair"`
        )
        process.exit(1)
      }

      // @ts-ignore
      const kp = Keypair.parse(config.get('private-key'))

      await Access.validateAndRegister({
        url: new URL('http://127.0.0.1:8787'),
        issuer: kp,
        caveats: {
          as: 'mailto:hugo@dag.house',
        },
        onAwait: () => {
          spinner.text = 'Waiting for email validation...'
        },
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
