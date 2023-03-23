/* eslint-disable unicorn/prefer-number-properties */
import * as UCAN from '@ipld/dag-ucan'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { ed25519 } from '@ucanto/principal'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Context from './context.js'
import { Access } from '@web3-storage/capabilities'
// eslint-disable-next-line unicorn/prefer-export-from
export { Context }

/**
 * @param {Types.UCAN.View} ucan
 * @param {import('miniflare').Miniflare} mf
 */
export async function send(ucan, mf) {
  return mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UCAN.format(ucan)}`,
    },
  })
}

/**
 * @param {Types.Signer} issuer
 * @param {Types.Principal<UCAN.DID>} service
 * @param {Types.ConnectionView<import('@web3-storage/access/types').Service>} conn
 * @param {string} email
 */
export async function createSpace(issuer, service, conn, email) {
  const space = await ed25519.generate()
  const spaceDelegation = await Voucher.top.delegate({
    issuer: space,
    audience: issuer,
    with: space.did(),
    expiration: Infinity,
  })
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: space.did(),
      nb: {
        // @ts-ignore
        identity: `mailto:${email}`,
        product: 'product:free',
        service: service.did(),
      },
      proofs: [spaceDelegation],
    })
    .execute(conn)
  if (!claim || claim.error) {
    throw new Error('failed to create space', { cause: claim })
  }

  const delegation = stringToDelegation(claim)
  const serviceDelegation = await Voucher.top.delegate({
    issuer: space,
    audience: service,
    with: space.did(),
    expiration: Infinity,
  })
  const redeem = await Voucher.redeem
    .invoke({
      issuer,
      audience: service,
      with: service.did(),
      nb: {
        space: space.did(),
        identity: delegation.capabilities[0].nb.identity,
        product: delegation.capabilities[0].nb.product,
      },
      facts: [
        {
          space: {
            name: `name-${email}`,
          },
          agent: {
            name: 'testing-agent',
            type: 'device',
            description: 'testing',
            url: 'https://dag.house',
            image: 'https://dag.house/logo.jpg',
          },
        },
      ],

      proofs: [delegation, serviceDelegation],
    })
    .execute(conn)

  if (redeem?.error) {
    // eslint-disable-next-line no-console
    console.log('create space util error', redeem)
    throw new Error(redeem.message)
  }

  return {
    space,
    delegation: spaceDelegation,
  }
}

/**
 * Return whether the provided stack trace string appears to be generated
 * by a deployed upload-api.
 * Heuristics:
 * * stack trace files paths will start with `file:///var/task/upload-api` because of how the lambda environment is working
 *
 * @param {string} stack
 */
export function isUploadApiStack(stack) {
  return stack.includes('file:///var/task/upload-api')
}

/**
 * @typedef {import('../../src/utils/email').ValidationEmailSend} ValidationEmailSend
 * @typedef {import('../../src/utils/email').Email} Email
 */

/**
 * create an Email that is useful for testing
 *
 * @param {Pick<Array<ValidationEmailSend>, 'push'>} storage
 * @returns {Pick<Email, 'sendValidation'>}
 */
export function createEmail(storage) {
  const email = {
    /**
     * @param {ValidationEmailSend} email
     */
    async sendValidation(email) {
      storage.push(email)
    },
  }
  return email
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

export const w3 = ed25519
  .parse(
    'MgCYKXoHVy7Vk4/QjcEGi+MCqjntUiasxXJ8uJKY0qh11e+0Bs8WsdqGK7xothgrDzzWD0ME7ynPjz2okXDh8537lId8='
  )
  .withDID('did:web:test.web3.storage')

/**
 * Creates a server for the given service.
 *
 * @template {Record<string, any>} Service
 * @param {object} options
 * @param {Service} options.service
 * @param {Server.API.Signer<Server.API.DID<'web'>>} [options.id]
 * @param {Server.Transport.RequestDecoder} [options.decoder]
 * @param {Server.Transport.ResponseEncoder} [options.encoder]
 */
export const createServer = ({
  id = w3,
  service,
  decoder = CAR,
  encoder = CBOR,
}) =>
  Server.create({
    id,
    encoder,
    decoder,
    service,
  })

/**
 * Creates a connection to the server over given channel.
 *
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Types.Service>} options.channel
 * @param {Types.Transport.RequestEncoder} [options.encoder]
 * @param {Types.Transport.ResponseDecoder} [options.decoder]
 */
export const connect = ({ id, channel, encoder = CAR, decoder = CBOR }) =>
  Client.connect({
    id,
    channel,
    encoder,
    decoder,
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
 * @param {object} [options.server]
 * @param {Types.Transport.RequestDecoder} [options.server.decoder]
 * @param {Types.Transport.ResponseEncoder} [options.server.encoder]
 * @param {object} [options.client]
 * @param {Types.Transport.RequestEncoder} [options.client.encoder]
 * @param {Types.Transport.ResponseDecoder} [options.client.decoder]
 */
export const createChannel = ({ id = w3, service, ...etc }) => {
  const server = createServer({ id, service, ...etc.server })
  const client = connect({ id, channel: server, ...etc.client })

  return { server, client }
}

/**
 * @param {Context.Options} options
 */
export const createContextWithMailbox = async ({ env, globals } = {}) => {
  /** @type {{to:string, url:string}[]} */
  const emails = []
  const email = createEmail(emails)
  const context = await Context.context({
    env,
    globals: {
      email,
      ...globals,
    },
  })

  return { ...context, emails }
}

/**
 * Utility function that creates a delegation from account to agent and an
 * attestation from service to proof it. Proofs can be used to invoke any
 * capability on behalf of the account.
 *
 * @param {object} input
 * @param {Types.UCAN.Signer<Types.DID<'mailto'>>} input.account
 * @param {Types.Signer<Types.DID<'web'>>} input.service
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

  const attest = await Access.session
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
