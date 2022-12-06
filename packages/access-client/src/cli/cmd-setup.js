/* eslint-disable no-console */
import inquirer from 'inquirer'
import { AgentData } from '../agent-data.js'
import { StoreConf } from '../stores/store-conf.js'

/**
 * @param {{ profile: string, force: boolean }} opts
 */
export async function cmdSetup(opts) {
  const store = new StoreConf({ profile: opts.profile })
  console.log('Path:', store.path)

  if (opts.force) {
    await store.reset()
  }

  const data = await store.load()

  if (data) {
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
    await AgentData.create(
      {
        meta: {
          name,
          type,
        },
      },
      { store }
    )

    console.log('Agent is ready to use.')
  }
}
