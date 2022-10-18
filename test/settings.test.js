import { Delegation, decodeLink } from '@ucanto/core'
import { SigningPrincipal } from '@ucanto/principal'
import { beforeEach, describe, expect, it } from 'vitest'

import * as defaults from '../src/defaults'
import { createClient } from '../src/index.js'
import { exportSettings, importSettings } from '../src/settings.js'
import fixture from './fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('settings', () => {
  beforeEach(async (context) => {
    context.settings = new Map()
    context.settings.set(
      'account_secret',
      // secret is stored as bytes, so set it as bytes into settings.
      SigningPrincipal.format(
        SigningPrincipal.parse(fixture.alice_account_secret)
      )
    )

    context.settings.set(
      'agent_secret',
      // secret is stored as bytes, so set it as bytes into settings.
      SigningPrincipal.format(
        SigningPrincipal.parse(fixture.alice_account_secret)
      )
    )
  })

  describe('#exportSettings', () => {
    it('should create a json object that contains the agent_secret and account_secret', async ({
      settings,
    }) => {
      const exported = exportSettings(settings)

      expect(exported).toHaveProperty('agent_secret')
      expect(exported).toHaveProperty('account_secret')
    })
  })

  describe('#importSettings', () => {
    it('should create a map that contains the agent_secret and account_secret', async ({
      settings,
    }) => {
      const exported = exportSettings(settings)
      const imported = await importSettings(JSON.stringify(exported))

      expect(imported.has('agent_secret')).toBeTruthy()
      expect(imported.has('account_secret')).toBeTruthy()
    })

    // commented out as this is a test for migration only.
    //     it('should be able to import old agent secret', async () => {
    //       const imported = await importSettings(
    //         JSON.stringify({
    //           agent_secret: fixture.agent_secret,
    //         })
    //       )
    //
    //       expect(imported.has('agent_secret')).toBeTruthy()
    //     })

    it('should, after put into client, auto-generate a delegation from account to agent', async ({
      settings,
    }) => {
      const exported = exportSettings(settings)
      const imported = await importSettings(JSON.stringify(exported))

      const client = createClient({
        serviceDID: fixture.did,
        serviceURL: 'http://localhost',
        accessDID: fixture.did,
        accessURL: 'http://localhost',
        settings,
      })

      const { agent, account, with: withDid, proofs } = await client.identity()

      expect(agent).toBeTruthy()
      expect(account).toBeTruthy()
      expect(withDid).toBeTruthy()
      expect(proofs).toBeTruthy()

      expect(SigningPrincipal.format(agent)).toEqual(
        fixture.alice_account_secret
      )

      expect(SigningPrincipal.format(account)).toEqual(
        fixture.alice_account_secret
      )

      expect(withDid).toEqual(account.did())
      expect(proofs).toHaveLength(1)
    })
  })
})
