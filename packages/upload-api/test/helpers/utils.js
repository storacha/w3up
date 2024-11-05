import * as Types from '../../src/types.js'
import { ed25519 } from '@ucanto/principal'
import * as principal from '@ucanto/principal'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as Context from './context.js'
import { Provider, UCAN, Space } from '@web3-storage/capabilities'
import * as DidMailto from '@web3-storage/did-mailto'
import * as API from '../types.js'
import { stringToDelegation } from '@web3-storage/access/encoding'

export { Context }

/**
 * Return whether the provided stack trace string appears to be generated
 * by a deployed upload-api.
 * Heuristics:
 * - stack trace files paths will start with `file:///var/task/upload-api` because of how the lambda environment is working
 *
 * @param {string} stack
 */
export function isUploadApiStack(stack) {
  return stack.includes('file:///var/task/upload-api')
}

/** did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi */
export const alice = ed25519.parse(
  'MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM='
)
/** did:key:z6MkffDZCkCTWreg8868fG1FGFogcJj5X6PY93pPcWDn9bob */
export const bob = ed25519.parse(
  'MgCYbj5AJfVvdrjkjNCxB3iAUwx7RQHVQ7H1sKyHy46Iose0BEevXgL1V73PD9snOCIoONgb+yQ9sycYchQC8kygR4qY='
)
/** did:key:z6MktafZTREjJkvV5mfJxcLpNBoVPwDLhTuMg9ng7dY4zMAL */
export const mallory = ed25519.parse(
  'MgCYtH0AvYxiQwBG6+ZXcwlXywq9tI50G2mCAUJbwrrahkO0B0elFYkl3Ulf3Q3A/EvcVY0utb4etiSE8e6pi4H0FEmU='
)

export const w3Signer = ed25519.parse(
  'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
)
export const w3 = w3Signer.withDID('did:web:test.web3.storage')

export const gatewaySigner = ed25519.parse(
  'MgCaNpGXCEX0+BxxE4SjSStrxU9Ru/Im+HGNQ/JJx3lDoI+0B3NWjWW3G8OzjbazZjanjM3kgfcZbvpyxv20jHtmcTtg='
)
export const gateway = gatewaySigner.withDID('did:web:w3s.link')

/**
 * Creates a server for the given service.
 *
 * @template {Record<string, any>} Service
 * @param {object} options
 * @param {Service} options.service
 * @param {Server.API.Signer<Server.API.DID<'web'>>} [options.id]
 * @param {Server.InboundCodec} [options.codec]
 */
export const createServer = ({ id = w3, service, codec = CAR.inbound }) =>
  Server.create({
    id,
    codec,
    service,
    validateAuthorization,
  })

/**
 * Creates a connection to the server over given channel.
 *
 * @template {Record<string, any>} Service
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Service>} options.channel
 * @param {Types.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

/**
 * Creates a server for the given service and an in-process connection to
 * it. You can pass optional parameters to configure identifier or transports
 * used.
 *
 * @template {Record<string, any>} Service
 * @param {object} options
 * @param {Service} options.service
 * @param {Server.API.Signer<Server.API.DID<'web'>>} options.id
 * @param {Types.Transport.Channel<Service>} options.server
 */
export const createChannel = ({ id = w3, service, ...etc }) => {
  const server = createServer({ id, service, ...etc.server })
  const client = connect({ id, channel: server })

  return { server, client }
}

/**
 * Utility function that creates a delegation from account to agent and an
 * attestation from service to proof it. Proofs can be used to invoke any
 * capability on behalf of the account.
 *
 * @param {object} input
 * @param {Types.UCAN.Signer<Types.AccountDID>} input.account
 * @param {Types.Signer<Types.ServiceDID>} input.service
 * @param {Types.Signer} input.agent
 */
export const createAuthorization = async ({ account, agent, service }) => {
  // Issue authorization from account DID to agent DID
  const authorization = await Server.delegate({
    issuer: account,
    audience: agent,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    expiration: Infinity,
  })

  const attest = await UCAN.attest
    .invoke({
      issuer: service,
      audience: agent,
      with: service.did(),
      nb: {
        proof: authorization.cid,
      },
      expiration: Infinity,
    })
    .delegate()

  return [authorization, attest]
}

/**
 * @param {object} input
 * @param {Types.Signer<Types.ServiceDID>} input.service
 * @param {Types.Principal<Types.SpaceDID>} input.space
 * @param {Types.Signer<Types.DIDKey>} input.agent
 * @param {Types.UCAN.Signer<Types.AccountDID>} input.account
 * @param {Types.ConnectionView<Types.Service>} input.connection
 */
export const provisionProvider = async ({
  service,
  agent,
  space,
  account,
  connection,
}) =>
  Provider.add
    .invoke({
      issuer: agent,
      audience: service,
      with: account.did(),
      nb: {
        provider: service.did(),
        consumer: space.did(),
      },
      proofs: await createAuthorization({ agent, service, account }),
    })
    .execute(connection)

/**
 * @template T
 * @param {T[]} buffer
 * @returns
 */
export const queue = (buffer = []) => {
  /** @type {Array<(input:T) => void>} */
  const reads = []

  /**
   * @param {T} message
   */
  const put = (message) => {
    const read = reads.shift()
    if (read) {
      read(message)
    } else {
      buffer.push(message)
    }
  }

  /**
   * @returns {Promise<T>}
   */
  const take = () => {
    return new Promise((resolve) => {
      const message = buffer.shift()
      if (message) {
        resolve(message)
      } else {
        reads.push(resolve)
      }
    })
  }

  return { put, take }
}

/**
 * @param {Types.Signer} issuer
 * @param {Types.Signer<Types.ServiceDID>} service
 * @param {Types.ConnectionView<import('@web3-storage/access/types').Service>} conn
 * @param {`${string}@${string}`} email
 */
export async function createSpace(issuer, service, conn, email) {
  const space = await ed25519.generate()
  const account = principal.Absentee.from({ id: DidMailto.fromEmail(email) })
  const proofs = await createAuthorization({ agent: issuer, service, account })
  await Provider.add
    .invoke({
      issuer,
      audience: service,
      with: account.did(),
      nb: {
        provider: /** @type {Types.DID<'web'>} */ (service.did()),
        consumer: space.did(),
      },
      proofs,
    })
    .execute(conn)
  const spaceDelegation = await Space.top.delegate({
    issuer: space,
    audience: issuer,
    with: space.did(),
    expiration: Infinity,
  })
  return {
    space,
    delegation: spaceDelegation,
  }
}

export const validateAuthorization = () => ({ ok: {} })

/**
 * @param {URL} confirmationUrl
 * @returns {Promise<API.Invocation<API.AccessConfirm>>}
 */
export async function extractConfirmInvocation(confirmationUrl) {
  const delegation = stringToDelegation(
    confirmationUrl.searchParams.get('ucan') ?? ''
  )
  if (
    delegation.capabilities.length !== 1 ||
    delegation.capabilities[0].can !== 'access/confirm'
  ) {
    throw new Error(`parsed unexpected delegation from confirmationUrl`)
  }
  const confirm = /** @type {API.Invocation<API.AccessConfirm>} */ (delegation)
  return confirm
}

/**
 * @param {API.ConnectionView<import('@web3-storage/access').Service>} connection
 * @param {{ url: string|URL }} confirmation
 */
export async function confirmConfirmationUrl(connection, confirmation) {
  // extract confirmation invocation from email that was sent by service while handling access/authorize
  const confirm = await extractConfirmInvocation(new URL(confirmation.url))
  // invoke the access/confirm invocation as if the user had clicked the email
  const [confirmResult] = await connection.execute(confirm)
  if (confirmResult.out.error) {
    throw confirmResult.out.error
  }
}
