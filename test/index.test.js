import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import * as Capabilities from '@web3-storage/access/capabilities'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createClient } from '../src/index.js'
import fixture from './fixture.js'
import { makeMockServer } from './server.fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('client', () => {
  beforeEach(async (context) => {
    const settings = new Map()
    settings.set(
      'secret',
      // secret is stored as bytes, so set it as bytes into settings.
      SigningPrincipal.encode(
        SigningPrincipal.parse(fixture.alice_account_secret)
      )
    )

    context.accessServer = await makeMockServer({
      capabilities: [
        Capabilities.identityRegister,
        Capabilities.identityValidate,
      ],
    })

    context.client = createClient({
      serviceDID: fixture.did,
      serviceURL: 'http://localhost',
      accessDID: context.accessServer.service.id.did(),
      accessURL: context.accessServer.url,
      settings,
    })

    context.parsedAliceAccountSecret = SigningPrincipal.parse(
      fixture.alice_account_secret
    )
  })

  describe('createClient', () => {
    it('should return a client.', async ({ client }) => {
      expect(client).toBeTruthy()
    })
  })

  describe('#identity', () => {
    it('should return a parsed id when it exists.', async (context) => {
      const id = await context.client.identity()
      expect(id).toStrictEqual(context.parsedAliceAccountSecret)
    })

    it('should return a new id when one is not stored.', async (context) => {
      const client = createClient({
        serviceDID: fixture.did,
        serviceURL: 'http://localhost',
        accessDID: fixture.did,
        accessURL: 'http://localhost',
        settings: new Map(),
      })
      const id = await client.identity()

      expect(id).not.toStrictEqual(context.parsedAliceAccountSecret)
    })
  })

//   describe('#register', () => {
//     it('should throw when invalid email passed.', async (context) => {
//       expect(() => context.client.register()).rejects.toThrow(
//         /^Invalid email provided for registration:.*/
//       )
//     })
//     it('should throw when different email passed.', async (context) => {
//       context.client.settings.set('email', 'banana@banana.com')
//       expect(() => context.client.register('test@test.com')).rejects.toThrow(
//         /^Trying to register a second email.*/
//       )
//     })
//     it('should actually call service', async ({ client, accessServer }) => {
//       client.settings.set('email', 'test@test.com')
//
//       const accessServerRequestSpy = vi.spyOn(
//         accessServer.service,
//         'handleRequest'
//       )
//
//       const result = await client.register('test@test.com')
//       console.log('result', result)
//       expect(accessServerRequestSpy).toHaveBeenCalledOnce()
//     })
//   })
})
