import * as Account from '@storacha/client/account'
import * as Result from '@storacha/client/result'
import * as DidMailto from '@storacha/did-mailto'
import { getClient } from './lib.js'
import ora from 'ora'

/**
 * @typedef {Awaited<ReturnType<Account.login>>['ok']&{}} View
 */

/**
 * @param {DidMailto.EmailAddress} email
 */
export const login = async (email) => loginWithClient(email, await getClient())

/**
 * @param {DidMailto.EmailAddress} email
 * @param {import('@storacha/client').Client} client
 * @returns {Promise<View>}
 */
export const loginWithClient = async (email, client) => {
  /** @type {import('ora').Ora|undefined} */
  let spinner
  const timeout = setTimeout(() => {
    spinner = ora(
      `🔗 please click the link sent to ${email} to authorize this agent`
    ).start()
  }, 1000)
  try {
    const account = Result.try(await Account.login(client, email))

    Result.try(await account.save())

    if (spinner) spinner.stop()
    console.log(`⁂ Agent was authorized by ${account.did()}`)
    return account
  } catch (err) {
    if (spinner) spinner.stop()
    console.error(err)
    process.exit(1)
  } finally {
    clearTimeout(timeout)
  }
}

export const list = async () => {
  const client = await getClient()
  const accounts = Object.values(Account.list(client))
  for (const account of accounts) {
    console.log(account.did())
  }

  if (accounts.length === 0) {
    console.log(
      '⁂ Agent has not been authorized yet. Try `storacha login` to authorize this agent with your account.'
    )
  }
}
