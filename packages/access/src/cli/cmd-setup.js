/* eslint-disable no-console */
import inquirer from 'inquirer'
import { StoreConf } from '../stores/store-conf.js'

/**
 * @param {{ profile: any; }} opts
 */
export async function cmdSetup(opts) {
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
}
