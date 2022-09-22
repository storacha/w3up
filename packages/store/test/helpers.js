import HTTP from 'node:http'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Capabilities from '@web3-storage/access/capabilities'
import * as Service from '@ucanto/server'
import * as Client from '@ucanto/client'

/** @typedef {{headers:Record<string, string>, body:Uint8Array}} Payload */

/** @param {{handleRequest(request:Payload):Client.Await<Payload>}} service */
export async function listen(service) {
  const server = HTTP.createServer(async (request, response) => {
    console.log('handleRequest')

    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }

    console.log('got body', chunks)
    try {
      const { headers, body } = await service.handleRequest({
        // @ts-ignore - node type is Record<string, string|string[]|undefined>
        headers: request.headers,
        body: Buffer.concat(chunks),
      })

      console.log('writing response', headers, body)
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
  return Object.assign(server, { url: new URL(`http://localhost:${port}`) })
}

export async function makeMockAccessServer({ id }) {
  const service = Service.create({
    decoder: CAR,
    encoder: CBOR,
    id,
    service: {
      identity: {
        identify: Service.provide(
          Capabilities.identityIdentify,
          async ({ capability, invocation }) => {
            return {
              error: true,
              name: 'NotRegistered',
              message: `No account is registered for ${capability.with}`,
            }
          }
        ),
      },
    },
  })

  return await listen({
    handleRequest: service.request.bind(service),
  })
}
