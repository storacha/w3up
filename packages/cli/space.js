import * as W3Space from '@storacha/client/space'
import * as W3Account from '@storacha/client/account'
import * as UcantoClient from '@ucanto/client'
import { HTTP } from '@ucanto/transport'
import * as CAR from '@ucanto/transport/car'
import { getClient } from './lib.js'
import process from 'node:process'
import * as DIDMailto from '@storacha/did-mailto'
import * as Account from './account.js'
import { SpaceDID } from '@storacha/capabilities/utils'
import ora from 'ora'
import { select, input } from '@inquirer/prompts'
import { mnemonic } from './dialog.js'
import { API } from '@ucanto/core'
import * as Result from '@storacha/client/result'

/**
 * @typedef {object} CreateOptions
 * @property {false} [recovery]
 * @property {false} [caution]
 * @property {DIDMailto.EmailAddress|false} [customer]
 * @property {string|false} [account]
 * @property {Array<{id: import('@ucanto/interface').DID, serviceEndpoint: string}>} [authorizeGatewayServices] - The DID Key or DID Web and URL of the Gateway to authorize to serve content from the created space.
 * @property {boolean} [skipGatewayAuthorization] - Whether to skip the Gateway authorization. It means that the content of the space will not be served by any Gateway.
 *
 * @param {string|undefined} name
 * @param {CreateOptions} options
 */
export const create = async (name, options) => {
  const client = await getClient()
  const spaces = client.spaces()

  let space
  if (options.skipGatewayAuthorization === true) {
    space = await client.createSpace(await chooseName(name ?? '', spaces), {
      skipGatewayAuthorization: true,
    })
  } else {
    const gateways = options.authorizeGatewayServices ?? []
    const connections = gateways.map(({ id, serviceEndpoint }) => {
      /** @type {UcantoClient.ConnectionView<import('@storacha/client/types').ContentServeService>} */
      const connection = UcantoClient.connect({
        id: {
          did: () => id,
        },
        codec: CAR.outbound,
        channel: HTTP.open({ url: new URL(serviceEndpoint) }),
      })
      return connection
    })
    space = await client.createSpace(await chooseName(name ?? '', spaces), {
      authorizeGatewayServices: connections,
    })
  }

  // Unless use opted-out from paper key recovery, we go through the flow
  if (options.recovery !== false) {
    const recovery = await setupRecovery(space, options)
    if (recovery == null) {
      console.log(
        '⚠️ Aborting, if you want to create space without recovery option pass --no-recovery flag'
      )
      process.exit(1)
    }
  }

  if (options.customer !== false) {
    console.log('🏗️ To serve this space we need to set a billing account')
    const setup = await setupBilling(client, {
      customer: options.customer,
      space: space.did(),
      message: '🚜 Setting a billing account',
    })

    if (setup.error) {
      if (setup.error.reason === 'abort') {
        console.log(
          '⏭️ Skipped billing setup. You can do it later using `storacha space provision`'
        )
      } else {
        console.error(
          '⚠️ Failed to to set billing account. You can retry using `storacha space provision`'
        )
        console.error(setup.error.cause.message)
      }
    } else {
      console.log(`✨ Billing account is set`)
    }
  }

  // Authorize this client to allow them to use this space.
  // ⚠️ This is a temporary solution until we solve the account sync problem
  // after which we will simply delegate to the account.
  const authorization = await space.createAuthorization(client)
  await client.addSpace(authorization)
  // set this space as the current default space
  await client.setCurrentSpace(space.did())

  // Unless user opted-out we go through an account authorization flow
  if (options.account !== false) {
    console.log(
      `⛓️ To manage space across devices we need to authorize an account`
    )

    const account = options.account
      ? await useAccount(client, { email: options.account })
      : await selectAccount(client)

    if (account) {
      const spinner = ora(`📩 Authorizing ${account.toEmail()}`).start()
      const recovery = await space.createRecovery(account.did())

      const result = await client.capability.access.delegate({
        space: space.did(),
        delegations: [recovery],
      })
      spinner.stop()

      if (result.ok) {
        console.log(`✨ Account is authorized`)
      } else {
        console.error(
          `⚠️ Failed to authorize account. You can still manage space using "paper key"`
        )
        console.error(result.error)
      }
    } else {
      console.log(
        `⏭️ Skip account authorization. You can still can manage space using "paper key"`
      )
    }
  }

  console.log(`⁂ Space created: ${space.did()}`)

  return space
}

/**
 * @param {import('@storacha/client').Client} client
 * @param {object} options
 * @param {import('@storacha/client/types').SpaceDID} options.space
 * @param {DIDMailto.EmailAddress} [options.customer]
 * @param {string} [options.message]
 * @param {string} [options.waitMessage]
 * @returns {Promise<API.Result<{}, {reason:'abort'}|{reason: 'error', cause: Error}>>}
 */
const setupBilling = async (
  client,
  {
    customer,
    space,
    message = 'Setting up a billing account',
    waitMessage = 'Waiting for payment plan to be selected',
  }
) => {
  const account = customer
    ? await useAccount(client, { email: customer })
    : await selectAccount(client)

  if (account) {
    const spinner = ora(waitMessage).start()

    let plan = null
    while (!plan) {
      const result = await account.plan.get()

      if (result.ok) {
        plan = result.ok
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    spinner.text = message

    const result = await account.provision(space)

    spinner.stop()
    if (result.error) {
      return { error: { reason: 'error', cause: result.error } }
    } else {
      return { ok: {} }
    }
  } else {
    return { error: { reason: 'abort' } }
  }
}

/**
 * @typedef {object} ProvisionOptions
 * @property {DIDMailto.EmailAddress} [customer]
 * @property {string} [coupon]
 * @property {string} [provider]
 * @property {string} [password]
 *
 * @param {string} name
 * @param {ProvisionOptions} options
 */
export const provision = async (name = '', options = {}) => {
  const client = await getClient()
  const space = chooseSpace(client, { name })
  if (!space) {
    console.log(
      `You do not appear to have a space, you can create one by running "w3 space create"`
    )
    process.exit(1)
  }

  if (options.coupon) {
    const { ok: bytes, error: fetchError } = await fetch(options.coupon)
      .then((response) => response.arrayBuffer())
      .then((buffer) => Result.ok(new Uint8Array(buffer)))
      .catch((error) => Result.error(/** @type {Error} */ (error)))

    if (fetchError) {
      console.error(`Failed to fetch coupon from ${options.coupon}`)
      process.exit(1)
    }

    const { ok: access, error: couponError } = await client.coupon
      .redeem(bytes, options)
      .then(Result.ok, Result.error)

    if (!access) {
      console.error(`Failed to redeem coupon: ${couponError.message}}`)
      process.exit(1)
    }

    const result = await W3Space.provision(
      { did: () => space },
      {
        proofs: access.proofs,
        agent: client.agent,
      }
    )

    if (result.error) {
      console.log(`Failed to provision space: ${result.error.message}`)
      process.exit(1)
    }
  } else {
    const result = await setupBilling(client, {
      customer: options.customer,
      space,
    })

    if (result.error) {
      console.error(
        `⚠️ Failed to set up billing account,\n ${
          Object(result.error).message ?? ''
        }`
      )
      process.exit(1)
    }
  }

  console.log(`✨ Billing account is set`)
}

/**
 * @typedef {import('@storacha/client/types').SpaceDID} SpaceDID
 *
 * @param {import('@storacha/client').Client} client
 * @param {object} options
 * @param {string} options.name
 * @returns {SpaceDID|undefined}
 */
const chooseSpace = (client, { name }) => {
  if (name) {
    const result = SpaceDID.read(name)
    if (result.ok) {
      return result.ok
    }

    const space = client.spaces().find((space) => space.name === name)
    if (space) {
      return /** @type {SpaceDID} */ (space.did())
    }
  }

  return /** @type {SpaceDID|undefined} */ (client.currentSpace()?.did())
}

/**
 *
 * @param {W3Space.Model} space
 * @param {CreateOptions} options
 */
export const setupEmailRecovery = async (space, options = {}) => {}

/**
 * @param {string} email
 * @returns {{ok: DIDMailto.EmailAddress, error?:void}|{ok?:void, error: Error}}
 */
const parseEmail = (email) => {
  try {
    return { ok: DIDMailto.email(email) }
  } catch (cause) {
    return { error: /** @type {Error} */ (cause) }
  }
}

/**
 * @param {W3Space.OwnedSpace} space
 * @param {CreateOptions} options
 */
export const setupRecovery = async (space, options = {}) => {
  const recoveryKey = W3Space.toMnemonic(space)

  if (options.caution === false) {
    console.log(formatRecoveryInstruction(recoveryKey))
    return space
  } else {
    const verified = await mnemonic({
      secret: recoveryKey.split(/\s+/g),
      message:
        'You need to save the following secret recovery key somewhere safe! For example write it down on a piece of paper and put it inside your favorite book.',
      revealMessage:
        '🤫 Make sure no one is eavesdropping and hit enter to reveal the key',
      submitMessage: '📝 Once you have saved the key hit enter to continue',
      validateMessage:
        '🔒 Please type or paste your recovery key to make sure it is correct',
      exitMessage: '🔐 Secret recovery key is correct!',
    }).catch(() => null)

    return verified ? space : null
  }
}

/**
 * @param {string} key
 */
const formatRecoveryInstruction = (key) =>
  `🔑 You need to save following secret recovery key somewhere safe! For example write it down on a piece of paper and put it inside your favorite book.

  ${key}

`

/**
 * @param {string} name
 * @param {{name:string}[]} spaces
 * @returns {Promise<string>}
 */
const chooseName = async (name, spaces) => {
  const space = spaces.find((space) => String(space.name) === name)
  const message =
    name === ''
      ? 'What would you like to call this space?'
      : space
      ? `Name "${space.name}" is already taken, please choose a different one`
      : null

  if (message == null) {
    return name
  } else {
    return await input({
      message,
    })
  }
}

/**
 * @param {import('@storacha/client').Client} client
 * @param {{email?:string}} options
 */
export const pickAccount = async (client, { email }) =>
  email ? await useAccount(client, { email }) : await selectAccount(client)

/**
 * @param {import('@storacha/client').Client} client
 * @param {{email?:string}} options
 */
export const useAccount = (client, { email }) => {
  const accounts = Object.values(W3Account.list(client))
  const account = accounts.find((account) => account.toEmail() === email)

  if (!account) {
    console.error(
      `Agent is not authorized by ${email}, please login with it first`
    )
    return null
  }

  return account
}

/**
 * @param {import('@storacha/client').Client} client
 */
export const selectAccount = async (client) => {
  const accounts = Object.values(W3Account.list(client))

  // If we do not have any accounts yet we take user through setup flow
  if (accounts.length === 0) {
    return setupAccount(client)
  }
  // If we have only one account we use it
  else if (accounts.length === 1) {
    return accounts[0]
  }
  // Otherwise we ask user to choose one
  else {
    return chooseAccount(accounts)
  }
}

/**
 * @param {import('@storacha/client').Client} client
 */
export const setupAccount = async (client) => {
  const email = await input({
    message: `📧 Please enter an email address to setup an account`,
    validate: (input) => parseEmail(input).ok != null,
  }).catch(() => null)

  return email
    ? await Account.loginWithClient(
        /** @type {DIDMailto.EmailAddress} */ (email),
        client
      )
    : null
}

/**
 * @param {Account.View[]} accounts
 * @returns {Promise<Account.View|null>}
 */
export const chooseAccount = async (accounts) => {
  const account = await select({
    message: 'Please choose an account you would like to use',
    choices: accounts.map((account) => ({
      name: account.toEmail(),
      value: account,
    })),
  }).catch(() => null)

  return account
}
