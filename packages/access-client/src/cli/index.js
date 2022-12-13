#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'fs'
import sade from 'sade'
import { NAME, pkg } from './config.js'
import { getService, selectSpace } from './utils.js'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { cmdCreateSpace } from './cmd-create-space.js'
import { cmdLink } from './cmd-link.js'
import { cmdSetup } from './cmd-setup.js'
import { cmdWhoami } from './cmd-whoami.js'
import { StoreConf } from '../stores/store-conf.js'
import { Agent } from '../agent.js'
import { abilitiesAsStrings } from '@web3-storage/capabilities'
import { delegationToString, stringToDelegation } from '../encoding.js'
import inquirer from 'inquirer'
import { Verifier } from '@ucanto/principal'
import path from 'path'

const prog = sade(NAME)
prog
  .version(pkg.version)
  .option('-p, --profile', 'Select the config profile to use.', 'main')
  .option(
    '--env',
    'Environment "production", "staging", "dev" or "local"',
    'production'
  )

prog.command('link [channel]').describe('Link.').action(cmdLink)
prog
  .command('setup')
  .option('--reset', 'Reset current store.', false)
  .describe('Setup agent keypair.')
  .action(cmdSetup)
prog.command('whoami').describe('Print config file content.').action(cmdWhoami)
prog
  .command('create-space')
  .describe('Create new space and register with the service.')
  .action(cmdCreateSpace)

prog
  .command('space')
  .describe('Space info.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const data = await store.load()
    const { url, servicePrincipal } = await getService(opts.env)
    if (data) {
      const agent = Agent.from(data, { store, url, servicePrincipal })
      const space = await selectSpace(agent)
      try {
        const result = await agent.getSpaceInfo(space)
        console.log(result)
      } catch (error_) {
        const error = /** @type {Error} */ (error_)
        console.log('Error', error.message)
      }
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })

prog
  .command('delegate')
  .describe('Delegation capabilities.')
  .option('--file', 'File to write the delegation into.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const data = await store.load()
    const { url, servicePrincipal } = await getService(opts.env)
    if (data) {
      const agent = Agent.from(data, { store, url, servicePrincipal })
      const space = await selectSpace(agent)

      await agent.setCurrentSpace(space)

      const { audience, expiration, name, type, abilities } =
        await inquirer.prompt([
          {
            type: 'input',
            name: 'audience',
            message: 'Input audience DID:',
          },
          {
            type: 'input',
            name: 'name',
            message: 'Input audience name:',
          },
          {
            type: 'list',
            name: 'type',
            default: 'device',
            choices: ['device', 'app', 'service'],
            message: 'Input audience type:',
          },
          {
            type: 'number',
            name: 'expiration',
            message: 'Input expiration in seconds:',
          },
          {
            type: 'checkbox',
            name: 'abilities',
            message: 'Input abilities to delegate:',
            choices: abilitiesAsStrings,
          },
        ])

      const delegation = await agent.delegate({
        audience: Verifier.parse(audience),
        audienceMeta: {
          name,
          type,
        },
        lifetimeInSeconds: isNaN(expiration) ? Infinity : expiration,
        abilities,
      })

      const delString = delegationToString(delegation)

      if (opts.file) {
        fs.writeFileSync(path.join(process.cwd(), opts.file), delString, {
          encoding: 'utf8',
        })
      } else {
        console.log(delString)
      }
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
    const data = await store.load()
    const { url, servicePrincipal } = await getService(opts.env)
    if (data) {
      const agent = Agent.from(data, { store, url, servicePrincipal })

      const del = fs.readFileSync(path.resolve(opts.delegation), {
        encoding: 'utf8',
      })

      await agent.importSpaceFromDelegation(stringToDelegation(del))
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })

prog
  .command('recover')
  .describe('Recover spaces with email.')
  .action(async (opts) => {
    const store = new StoreConf({ profile: opts.profile })
    const data = await store.load()
    const { url, servicePrincipal } = await getService(opts.env)
    if (data) {
      const agent = Agent.from(data, { store, url, servicePrincipal })

      const { email } = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          default: 'hugomrdias@gmail.com',
          message: 'Input email:',
        },
      ])

      const dels = await agent.recover(email)

      for (const del of dels) {
        const { did, meta } = await agent.importSpaceFromDelegation(del)
        console.log(`Imported space ${meta.name} with DID: ${did}`)
      }
    } else {
      console.error(`Run "${NAME} setup" first`)
    }
  })
prog.parse(process.argv)
