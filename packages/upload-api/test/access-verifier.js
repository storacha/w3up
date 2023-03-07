import * as API from '../src/types.js'
import { Space } from '@web3-storage/capabilities'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import { CAR, CBOR } from '@ucanto/transport'
import { Failure } from '@ucanto/server'

/**
 * @param {object} context
 * @param {object} context.models
 * @param {Map<string, {did: Server.UCAN.DID}>} context.models.spaces
 */
export const createService = (context) => ({
  space: {
    info: Server.provide(Space.info, async ({ capability, invocation }) => {
      const results = await context.models.spaces.get(capability.with)
      if (!results) {
        /** @type {API.SpaceUnknown} */
        const spaceUnknownFailure = {
          error: true,
          name: 'SpaceUnknown',
          message: `Space not found.`,
        }
        return spaceUnknownFailure
      }
      return results
    }),
  },
})

/**
 * @param {object} context
 * @param {Server.Signer} context.id
 * @param {object} context.models
 * @param {Map<string, {did: Server.UCAN.DID}>} context.models.spaces
 */
export const createServer = (context) =>
  Server.create({
    id: context.id,
    service: createService(context),
    encoder: CBOR,
    decoder: CAR,
  })

/**
 * @param {object} context
 * @param {Server.Signer} context.id
 * @returns {API.AccessVerifier & API.TestSpaceRegistry}
 */
export const create = ({ id }) => {
  const spaces = new Map()
  const server = createServer({
    id,
    models: {
      spaces,
    },
  })

  const client = Client.connect({
    id,
    channel: server,
    encoder: CAR,
    decoder: CBOR,
  })

  return {
    async registerSpace(space) {
      spaces.set(space, { did: id })
    },
    async allocateSpace(invocation) {
      // if info capability is derivable from the passed capability, then we'll
      // receive a response and know that the invocation issuer has verified
      // themselves with w3access.
      const result = await Space.info
        .invoke({
          issuer: id,
          audience: id,
          // @ts-expect-error
          with: invocation.capabilities[0].with,
          proofs: [invocation],
        })
        .execute(client)

      if (result.error) {
        return result.error && result.name === 'SpaceUnknown'
          ? new Failure(`Space has no storage provider`, { cause: result })
          : result
      } else {
        return {}
      }
    },
  }
}
