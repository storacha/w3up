import * as Client from '@ucanto/client'
import * as API from '@ucanto/interface'
import { Principal, SigningPrincipal } from '@ucanto/principal'
import { UCAN } from '@ucanto/server'
import * as Service from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Capabilities from '@web3-storage/access/capabilities'
import HTTP from 'node:http'

/** @typedef {{headers:Record<string, string>, body:Uint8Array}} Payload */

// const jwt = new
const fixture = {
  /** @type {import('@ucanto/interface').DID} */
  did: 'did:key:z6MkrZ1r512345678912345678912345678912345678912z',
}

/** @param {{
 * id: string,
 * handleRequest(request:Payload):Client.Await<Payload>
 * }} service */
export async function listen(service) {
  const server = HTTP.createServer(async (request, response) => {
    if (request.url.startsWith('/validate')) {
      response.writeHead(200)
      response.write('test')
      response.end()
      return
    }

    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }
    try {
      const { headers, body } = await service.handleRequest({
        // @ts-ignore - node type is Record<string, string|string[]|undefined>
        headers: request.headers,
        body: Buffer.concat(chunks),
      })
      response.writeHead(200, headers)
      response.write(body)
      response.end()
    } catch (error) {
      console.log('err', error)
    }
  })
  await new Promise((resolve) => server.listen(resolve))

  // @ts-ignore - this is actually what it returns on http
  const port = server.address().port
  return Object.assign(server, {
    url: new URL(`http://localhost:${port}`),
    service: service,
  })
}

/**
 * @param {any} capability
 * @param {any} [handler]
 * @returns {object}
 */
function MockCapability(capability, handler = () => null) {
  const handlerName = capability?.descriptor?.can || 'UNKNOWN/UNKNOWN'
  const route = handlerName.split('/')[1]

  return {
    [route]: Service.provide(capability, handler),
  }
}

/**
 * @async
 * @param {object} options
 * @param {Array<any>} options.capabilities
 * @returns {Promise<object>}
 */
export async function makeMockServer({ capabilities }) {
  const identity = {
    ...capabilities.reduce(
      (acc, cur) => ({ ...acc, ...MockCapability(cur) }),
      {}
    ),
  }

  const service = Service.create({
    decoder: CAR,
    encoder: CBOR,
    id: Principal.parse(fixture.did),
    service: {
      identity,
    },
  })

  return await listen({
    id: service.id,
    handleRequest: service.request.bind(service),
  })
}
