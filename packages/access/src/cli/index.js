#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import sade from 'sade'
import { Transform } from 'stream'
import undici from 'undici'
import { getConfig, NAME, pkg } from './config.js'
import { getService } from './utils.js'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { cmdCreateAccount } from './cmd-create-account.js'
import { cmdLink } from './cmd-link.js'
import { cmdSetup } from './cmd-setup.js'
import { cmdWhoami } from './cmd-whoami.js'
import { StoreConf } from '../stores/store-conf.js'
import { Agent } from '../agent.js'
import inquirer from 'inquirer'
import { Verifier } from '@ucanto/principal/ed25519'
import { delegationToString, stringToDelegation } from '../encoding.js'

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

prog.command('link [channel]').describe('Link.').action(cmdLink)
prog
  .command('setup')
  .option('--reset', 'Reset current store.', false)
  .describe('Print config file content.')
  .action(cmdSetup)
prog.command('whoami').describe('Print config file content.').action(cmdWhoami)
prog
  .command('create-account')
  .describe('Create new account.')
  .action(cmdCreateAccount)

prog
  .command('account')
  .describe('Account info.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const { url } = await getService(opts.env)
    if (await store.exists()) {
      const agent = await Agent.create({
        store,
        url,
      })

      const choices = []
      for (const [key, value] of agent.data.delegations.receivedByResource) {
        for (const d of value) {
          if (d.cap.can === 'account/info' || d.cap.can === 'account/*') {
            choices.push({ name: key })
          }
        }
      }

      const { account } = await inquirer.prompt([
        {
          type: 'list',
          name: 'account',
          default: 'device',
          choices,
          message: 'Select account:',
        },
      ])
      const result = await agent.getAccountInfo(account)
      if (result.error) {
        console.error(result.message)
      } else {
        console.log(result)
      }
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })

prog
  .command('delegate')
  .describe('Delegation capabilities.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const { url } = await getService(opts.env)
    if (await store.exists()) {
      const agent = await Agent.create({
        store,
        url,
      })

      const accountDids = agent.data.accounts.map((acc) => {
        return { name: acc.did() }
      })
      const { account } = await inquirer.prompt([
        {
          type: 'list',
          name: 'account',
          choices: accountDids,
          message: 'Select account:',
        },
      ])

      const abilities = []
      for (const [key, values] of agent.data.delegations.receivedByResource) {
        if (key === account) {
          for (const cap of values) {
            abilities.push({ name: cap.cap.can })
          }
        }
      }
      const { ability } = await inquirer.prompt([
        {
          type: 'list',
          name: 'ability',
          choices: abilities,
          message: 'Select ability:',
        },
      ])

      const { audience } = await inquirer.prompt([
        {
          type: 'input',
          name: 'audience',
          choices: abilities,
          message: 'Input audience:',
        },
      ])

      console.log(account, ability)

      const delegation = await agent.delegate(
        Verifier.parse(audience),
        [
          {
            can: ability,
            with: account,
          },
        ],
        800_000
      )

      console.log(await delegationToString(delegation))
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })

prog
  .command('import')
  .describe('Import delegation.')
  .option('--delegation')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const { url } = await getService(opts.env)
    if (await store.exists()) {
      const agent = await Agent.create({
        store,
        url,
      })

      const del = fs.readFileSync('./delegation', { encoding: 'utf8' })

      await agent.addDelegation(await stringToDelegation(del))
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })
prog.parse(process.argv)
