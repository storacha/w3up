#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import sade from 'sade'
import { Transform } from 'stream'
import undici from 'undici'
import { linkCmd } from './cmd-link.js'
import { getConfig, NAME, pkg } from './config.js'
import { getService } from './utils.js'
import inquirer from 'inquirer'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Agent } from '../agent.js'
import { StoreConf } from '../stores/store-conf.js'

const prog = sade(NAME)
prog
  .version(pkg.version)
  .option('-p, --profile', 'Select the config profile to use.', 'main')
  .option('--env', 'Env', 'production')

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

prog.command('link [channel]').describe('Link.').action(linkCmd)

prog
  .command('setup')
  .describe('Print config file content.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    console.log('Path:', store.path)

    if (await store.exists()) {
      console.log('Agent is already setup.')
    } else {
      const { name, type } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          default: 'cli',
          message: 'Input the name for this device:',
        },
        {
          type: 'list',
          name: 'type',
          default: 'device',
          choices: [{ name: 'device' }, { name: 'app' }, { name: 'service' }],
          message: 'Select this agent type:',
        },
      ])
      await store.init({
        meta: {
          name,
          type,
        },
      })

      console.log('Agent is ready to use.')
    }
  })

prog
  .command('whoami')
  .describe('Print config file content.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    if (await store.exists()) {
      const { delegations, meta, accounts, agent } = await store.load()

      console.log('Agent', agent.did(), meta)
      console.log('Accounts:')
      for (const acc of accounts) {
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
      console.error(`Run "${NAME} setup" first`)
    }
  })

prog
  .command('create-account')
  .describe('Create new account.')
  .action(async (opts) => {
    const { url } = await getService(opts.env)
    const store = new StoreConf({ profile: opts.profile })

    if (await store.exists()) {
      const spinner = ora('Registering with the service').start()
      const agent = await Agent.create({
        store,
        url,
      })

      spinner.stopAndPersist()
      const { email } = await inquirer.prompt({
        type: 'input',
        name: 'email',
        default: 'hugomrdias@gmail.com',
        message: 'Input your email to validate:',
      })
      spinner.start('Waiting for email validation...')
      try {
        await agent.createAccount(email)
        spinner.succeed(
          'Account has been created and register with the service.'
        )
      } catch (error) {
        console.error(error)
        // @ts-ignore
        spinner.fail(error.message)
        process.exit(1)
      }
    } else {
      console.error('run setup command first.')
      process.exit(1)
    }
  })

prog.parse(process.argv)
