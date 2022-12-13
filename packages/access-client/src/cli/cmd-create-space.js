/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-console */
import inquirer from 'inquirer'
import ora from 'ora'
import { Agent } from '../agent.js'
import { StoreConf } from '../stores/store-conf.js'
import { getService } from './utils.js'

/**
 * @param {{ profile: any; env: string }} opts
 */
export async function cmdCreateSpace(opts) {
  const { url, servicePrincipal } = await getService(opts.env)
  const store = new StoreConf({ profile: opts.profile })
  const data = await store.load()

  if (data) {
    const spinner = ora('Registering with the service').start()
    const agent = Agent.from(data, { store, url, servicePrincipal })

    spinner.stopAndPersist()
    const { email, name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Input your a name for the new space:',
      },
      {
        type: 'input',
        name: 'email',
        default: 'hugomrdias@gmail.com',
        message: 'Input your email to validate:',
      },
    ])
    try {
      spinner.start('Waiting for email validation...')
      const space = await agent.createSpace(name)

      await agent.setCurrentSpace(space.did)
      await agent.registerSpace(email)
      spinner.succeed('Space has been created and register with the service.')
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
}
