import { Delegation } from '@ucanto/core'
import { SigningPrincipal } from '@ucanto/principal'
import { beforeEach, describe, expect, it } from 'vitest'

import { createDelegation, importDelegation } from '../src/delegation.js'
import fixture from './fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('delegation', () => {
  describe('#createDelegation', () => {
    beforeEach(async (context) => {
      const issuer = await SigningPrincipal.generate()

      context.delegation = await createDelegation({
        issuer,
        did: fixture.did,
      })
    })

    it('should create a delegation', async ({ delegation }) => {
      expect(delegation).toBeDefined()
      expect(delegation).toBeInstanceOf(Uint8Array)
    })
  })

  describe('#importDelegation', () => {
    beforeEach(async (context) => {
      const issuer = await SigningPrincipal.generate()

      context.delegation = await createDelegation({
        issuer,
        did: fixture.did,
      })
    })

    it('should import a delegation', async ({ delegation }) => {
      const imported = await importDelegation(delegation)
      console.log('imported', imported)
      expect(imported).toBeDefined()
      //       expect(imported).toBeInstanceOf(Delegation)
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
