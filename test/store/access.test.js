import * as API from '@ucanto/interface'
import { SigningPrincipal } from '@ucanto/principal'
import * as Capabilities from '@web3-storage/access/capabilities'
import { beforeEach, describe, expect, it } from 'vitest'

import { connect } from '../../src/store/access/client'
import { makeMockServer } from '../server.fixture.js'

// The two tests marked with concurrent will be run in parallel
describe('access client', async () => {
  const accessServer = await makeMockServer({
    capabilities: [
      Capabilities.identityRegister,
      Capabilities.identityValidate,
      Capabilities.identityIdentify,
    ],
  })

  beforeEach(async (context) => {
    context.client = connect({
      id: accessServer.service.id.did(),
      url: accessServer.url,
    })
  })

  describe('when client is created', () => {
    it('should not be null', async ({ client }) => {
      expect(client).not.toBeNull()
    })
  })
  describe('when client invokes', () => {
    it('should get null from mocked server.', async ({ client }) => {
      const issuer = await SigningPrincipal.generate()

      const result = await Capabilities.identityValidate
        .invoke({
          issuer,
          audience: client.id,
          with: issuer.did(),
          caveats: {
            as: `mailto:test@test.com`,
          },
        })
        .execute(client)

      expect(result).toBeNull()
    })
  })
})
