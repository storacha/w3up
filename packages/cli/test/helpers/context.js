import * as API from '../../api.js'

import {
  createContext,
  cleanupContext,
} from '@storacha/upload-api/test/context'
import { createEnv } from './env.js'
import { Signer } from '@ucanto/principal/ed25519'
import { createServer as createHTTPServer } from './http-server.js'
import { createReceiptsServer } from './receipt-http-server.js'
import http from 'node:http'
import { StoreConf } from '@storacha/client/stores/conf'
import * as FS from 'node:fs/promises'

/** did:key:z6Mkqa4oY9Z5Pf5tUcjLHLUsDjKwMC95HGXdE1j22jkbhz6r */
export const alice = Signer.parse(
  'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
)
/** did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob */
export const bob = Signer.parse(
  'MgCYbj5AJfVvdrjkjNCxB3iAUwx7RQHVQ7H1sKyHy46Iose0BEevXgL1V73PD9snOCIoONgb+yQ9sycYchQC8kygR4qY='
)
/** did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL */
export const mallory = Signer.parse(
  'MgCYtH0AvYxiQwBG6+ZXcwlXywq9tI50G2mCAUJbwrrahkO0B0elFYkl3Ulf3Q3A/EvcVY0utb4etiSE8e6pi4H0FEmU='
)

export { createContext, cleanupContext }

/**
 * @typedef {Awaited<ReturnType<createContext>>} UcantoServerTestContext
 *
 * @param {UcantoServerTestContext} context
 * @param {object} input
 * @param {API.DIDKey} input.space
 * @param {API.DID<'mailto'>} input.account
 * @param {API.DID<'web'>} input.provider
 */
export const provisionSpace = async (context, { space, account, provider }) => {
  // add a provider for this space
  return await context.provisionsStorage.put({
    cause: /** @type {*} */ ({}),
    consumer: space,
    customer: account,
    provider,
  })
}

/**
 * @typedef {UcantoServerTestContext & {
 *   server: import('./http-server').TestingServer['server']
 *   receiptsServer: import('./receipt-http-server.js').TestingServer['server']
 *   router: import('./http-server').Router
 *   env: { alice: Record<string, string>, bob: Record<string, string> }
 *   serverURL: URL
 * }} Context
 *
 * @returns {Promise<Context>}
 */
export const setup = async () => {
  const context = await createContext({ http })
  const { server, serverURL, router } = await createHTTPServer({
    '/': context.connection.channel.request.bind(context.connection.channel),
  })
  const { server: receiptsServer, serverURL: receiptsServerUrl } =
    await createReceiptsServer()

  return Object.assign(context, {
    server,
    serverURL,
    receiptsServer,
    router,
    serverRouter: router,
    env: {
      alice: createEnv({
        storeName: `storacha-cli-test-alice-${context.service.did()}`,
        servicePrincipal: context.service,
        serviceURL: serverURL,
        receiptsEndpoint: new URL('receipt', receiptsServerUrl),
      }),
      bob: createEnv({
        storeName: `storacha-cli-test-bob-${context.service.did()}`,
        servicePrincipal: context.service,
        serviceURL: serverURL,
        receiptsEndpoint: new URL('receipt', receiptsServerUrl),
      }),
    },
  })
}

/**
 * @param {Context} context
 */
export const teardown = async (context) => {
  await cleanupContext(context)
  context.server.close()
  context.receiptsServer.close()

  const stores = [
    context.env.alice.STORACHA_STORE_NAME,
    context.env.bob.STORACHA_STORE_NAME,
  ]

  await Promise.all(
    stores.map(async (name) => {
      const { path } = new StoreConf({ profile: name })
      try {
        await FS.rm(path)
      } catch (/** @type {any} */ err) {
        if (err.code === 'ENOENT') return // is ok maybe it wasn't used in the test
        throw err
      }
    })
  )
}

/**
 * @param {(assert: import('entail').Assert, context: Context) => unknown} unit
 * @returns {import('entail').Test}
 */
export const test = (unit) => async (assert) => {
  const context = await setup()
  try {
    await unit(assert, context)
  } finally {
    await teardown(context)
  }
}
