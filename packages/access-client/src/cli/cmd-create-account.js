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
export async function cmdCreateAccount(opts) {
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
      await agent.registerSpace(email)
      spinner.succeed('Account has been created and register with the service.')
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
