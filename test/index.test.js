import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createClient } from '../src/index.js'
import * as Identity from '../src/store/access/client.js'
import fixture from './fixture.js'
import { makeMockServer } from './server.fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('client', () => {
  beforeEach(async (context) => {
    const settings = new Map()
    settings.set('account_secret', fixture.alice_account_secret)
    settings.set('agent_secret', fixture.alice_account_secret)

    context.accessServer = await makeMockServer({
      capabilities: [Identity.register, Identity.validate],
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

  describe('#account', () => {
    it.skip('should return an account when it exists.', async (context) => {
      const account = await context.client.account()
      expect(account).toStrictEqual(context.parsedAliceAccountSecret)
    })
  })

  describe('#agent', () => {
    it.skip('should return an agent when it exists.', async (context) => {
      const agent = await context.client.agent()
      expect(agent).toStrictEqual(context.parsedAliceAccountSecret)
    })
  })

  describe('#delegation', () => {
    it.skip('should return the default delegation.', async (context) => {
      const delegation = await context.client.currentDelegation()
      expect(delegation).toBeTruthy()
      expect(delegation).toHaveProperty('root')
    })

    it.skip('should have account did as with.', async (context) => {
      const delegation = await context.client.currentDelegation()
      expect(delegation.capabilities[0].with).toStrictEqual(
        (await context.client.account()).did()
      )
    })

    it.skip('should have agent did as audience.', async (context) => {
      const delegation = await context.client.currentDelegation()
      expect(delegation.audience.did()).toStrictEqual(
        (await context.client.agent()).did()
      )
    })
  })

  describe('#identity', () => {
    it.skip('should return an account when it exists.', async (context) => {
      const { account } = await context.client.identity()
      expect(account.did()).toStrictEqual(
        context.parsedAliceAccountSecret.did()
      )
    })

    it.skip('should return an agent when it exists.', async (context) => {
      const { agent } = await context.client.identity()
      expect(agent).toStrictEqual(context.parsedAliceAccountSecret)
    })

    it.skip('should build the account from old secret if one exists.', async (context) => {
      const settings = new Map()
      settings.set(
        'secret',
        SigningPrincipal.format(
          SigningPrincipal.parse(fixture.alice_account_secret)
        )
      )

      const client = createClient({
        serviceDID: fixture.did,
        serviceURL: 'http://localhost',
        accessDID: fixture.did,
        accessURL: 'http://localhost',
        settings,
      })
      const { account } = await client.identity()

      expect(account).toStrictEqual(context.parsedAliceAccountSecret)
    })

    it('should return a new id when one is not stored.', async (context) => {
      const client = createClient({
        serviceDID: fixture.did,
        serviceURL: 'http://localhost',
        accessDID: fixture.did,
        accessURL: 'http://localhost',
        settings: new Map(),
      })
      const { account } = await client.identity()

      expect(account).not.toStrictEqual(context.parsedAliceAccountSecret)
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
