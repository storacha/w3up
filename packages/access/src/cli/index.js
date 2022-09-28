#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import sade from 'sade'
import { Transform } from 'stream'
import undici from 'undici'
import * as Access from '../index.js'
import { linkCmd } from './cmd-link.js'
import { getConfig, NAME, pkg } from './config.js'
import { getService } from './utils.js'
import inquirer from 'inquirer'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Agent } from '../agent.js'
import { SigningPrincipal } from '@ucanto/principal'
import { StoreConf } from '../stores/store-conf.js'
import { Websocket } from '../utils/ws.js'

const prog = sade(NAME)
prog
  .version(pkg.version)
  .option('-p, --profile', 'Select the config profile to use.', 'main')
  .option('--env', 'Env', 'production')

prog
  .command('init')
  .describe('Create or save a keypair to the config.')
  .option('--force', 'Override config with new keypair.', false)
  .option('--private-key', 'Create new keypair with private key.')
  .action(async (opts) => {
    const config = getConfig(opts.profile)
    const spinner = ora('Creating new keypair').start()
    try {
      const privateKey = /** @type {string | undefined} */ (
        config.get('private-key')
      )

      // Save or override keypair
      if (opts['private-key']) {
        const kp = SigningPrincipal.parse(opts['private-key'])
        config.set('private-key', opts['private-key'])
        config.set('did', kp.did())
        spinner.succeed(`Keypair created and saved to ${config.path}`)
        return
      }

      // Create or override keypair
      if (opts.force || !privateKey) {
        const kp = await SigningPrincipal.generate()
        config.set('private-key', SigningPrincipal.format(kp))
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
  .action(async (opts) => {
    const config = getConfig(opts.profile)
    const { audience, url } = await getService(opts.env)
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} init"`
        )
        process.exit(1)
      }

      spinner.stopAndPersist()
      const { email } = await inquirer.prompt({
        type: 'input',
        name: 'email',
        message: 'Input your email to validate:',
      })

      spinner.start()

      // @ts-ignore
      const issuer = SigningPrincipal.parse(config.get('private-key'))
      await Access.validate({
        audience,
        url,
        issuer,
        caveats: {
          as: `mailto:${email}`,
        },
      })

      spinner.text = 'Waiting for email validation...'
      const proof = await Access.pullRegisterDelegation({
        issuer,
        url,
      })

      await Access.register({
        audience,
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
  .action(async (file, opts) => {
    const config = getConfig(opts.profile)
    const { url } = await getService(opts.env)
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} init"`
        )
        process.exit(1)
      }

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
  .action(async (opts) => {
    const config = getConfig(opts.profile)
    console.log('Path:', config.path)
    // console.log(JSON.stringify(config.store, undefined, 2))
    // const { audience, url } = await getService(opts.env)

    // const data = config.get('agent')
    // if (data) {
    //   // @ts-ignore
    //   const agent = await Agent.import(SigningPrincipal, config.get('agent'))
    //   console.log('did:', agent.did())

    //   // Delegations received
    //   console.log('Delegations received')
    //   for (const del of agent.delegations.received) {
    //     console.log('From:', del.issuer.did())
    //     for (const cap of del.capabilities) {
    //       console.log(cap)
    //     }
    //   }

    //   // Delegations created
    //   console.log('Delegations created')
    //   for (const c of agent.delegations.created) {
    //     console.log('To:', c.audience.did())
    //     for (const cap of c.capabilities) {
    //       console.log(cap)
    //     }
    //   }
    // }

    // const jwt = /** @type {string} */ (config.get('delegation'))
    // let proof
    // if (jwt) {
    //   const ucan = UCAN.parse(jwt)
    //   const root = await UCAN.write(ucan)
    //   /** @type {Types.Delegation<[import('../capabilities-types').IdentityIdentify]>} */
    //   proof = Delegation.create({ root })
    // }

    // // @ts-ignore
    // const issuer = Keypair.parse(config.get('private-key'))
    // const out = await Access.identify({
    //   audience,
    //   url,
    //   issuer,
    //   proof,
    // })
    // console.log('Account:', out)
  })

prog.command('link [channel]').describe('Link.').action(linkCmd)

prog
  .command('setup')
  .describe('Print config file content.')
  .action(async (opts) => {
    const config = getConfig(opts.profile)
    console.log('Path:', config.path)

    const agent = await Agent.create({
      store: new StoreConf({ profile: opts.profile }),
    })

    if (await agent.isSetup()) {
      const { delegations } = await agent.import()

      console.log('Agent', agent.did(), agent.meta)
      console.log('Accounts:')
      for (const acc of agent.accounts) {
        console.log(acc.did())
      }

      console.log('Delegations created:')
      for (const created of delegations.created) {
        console.log(created)
      }
      console.log('Delegations received:')
      for (const received of delegations.received) {
        console.log(`${received.issuer.did()} -> ${received.audience.did()}`)
        console.log(received.capabilities)
      }
    } else {
      const info = await agent.setup({
        name: 'cli-main',
        type: 'device',
      })

      console.log(info)
    }
  })

prog
  .command('create-account')
  .describe('Create new account.')
  .action(async (opts) => {
    const { url } = await getService(opts.env)
    const agent = await Agent.create({
      store: new StoreConf({ profile: opts.profile }),
      url,
    })

    if (await agent.isSetup()) {
      await agent.import()

      await agent.createAccount('hugomrdias@gmail.com')
    } else {
      throw new Error('run setup command first.')
    }
  })

prog.parse(process.argv)
