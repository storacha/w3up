import { Delegation, decodeLink } from '@ucanto/core'
import { SigningPrincipal } from '@ucanto/principal'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildDelegationCar,
  generateDelegation,
  importDelegation,
} from '../src/delegation.js'
import fixture from './fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('delegation', () => {
  describe('#createDelegation', () => {
    beforeEach(async (context) => {
      const issuer = await SigningPrincipal.generate()

      context.delegation = await buildDelegationCar({
        issuer,
        to: fixture.did,
      })
    })

    it('should create a delegation', async ({ delegation }) => {
      expect(delegation).toBeDefined()
      expect(delegation).toBeInstanceOf(Uint8Array)
    })

    it('should create a delegation with a given expiration', async () => {
      const delegation = await buildDelegationCar({
        issuer: await SigningPrincipal.generate(),
        to: fixture.did,
        expiration: 1000,
      })

      expect(delegation).toBeDefined()
      expect(delegation).toBeInstanceOf(Uint8Array)
    })
  })

  describe('#generateDelegation', () => {
    beforeEach(async (context) => {
      context.issuer = await SigningPrincipal.generate()
    })

    it('should create a delegation with a given expiration.', async ({
      issuer,
    }) => {
      const now = Date.now()
      const delegation = await generateDelegation({
        issuer,
        to: fixture.did,
        expiration: 1000,
      })

      expect(delegation).toBeDefined()
      expect(delegation.expiration).toBeGreaterThan(now + 999)
    })

    it('should have any store capabilities by default', async ({ issuer }) => {
      const now = Date.now()
      const delegation = await generateDelegation({
        issuer,
        to: fixture.did,
        expiration: 1000,
      })

      const capabilities = delegation.capabilities
      const cans = capabilities?.map((x) => x.can)

      expect(delegation).toBeDefined()
      expect(capabilities).toBeDefined()
      expect(cans).toContain('store/*')
      expect(cans).toContain('upload/*')
    })

    it('should NOT have any account capabilities by default', async ({
      issuer,
    }) => {
      const now = Date.now()
      const delegation = await generateDelegation({
        issuer,
        to: fixture.did,
        expiration: 1000,
      })

      const capabilities = delegation.capabilities
      const cans = capabilities?.map((x) => x.can)

      expect(delegation).toBeDefined()
      expect(capabilities).toBeDefined()
      expect(cans).toContain('store/*')
      expect(cans).toContain('upload/*')

      expect(cans).not.toContain('identity/identify')
      expect(cans).not.toContain('identity/register')
      expect(cans).not.toContain('identity/validate')
    })
  })

  describe('#importDelegation', () => {
    beforeEach(async (context) => {
      const issuer = await SigningPrincipal.generate()

      context.delegation = await buildDelegationCar({
        issuer,
        to: fixture.did,
      })
    })

    it('should import a delegation', async ({ delegation }) => {
      const imported = await importDelegation(delegation)
      expect(imported).toBeDefined()
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
