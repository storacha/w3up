import * as Identity from '../../src/store/access/client.js'
import { makeMockServer } from '../server.fixture.js'
import { SigningPrincipal } from '@ucanto/principal'
import { beforeEach, describe, expect, it } from 'vitest'

// The two tests marked with concurrent will be run in parallel
describe('access client', async () => {
  const accessServer = await makeMockServer({
    capabilities: [Identity.register, Identity.validate, Identity.identify]
  })

  beforeEach(async (context) => {
    context.client = Identity.createConnection({
      id: accessServer.service.id.did(),
      url: accessServer.url
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

      const result = await Identity.validate
        .invoke({
          issuer,
          audience: client.id,
          with: issuer.did(),
          caveats: {
            as: 'mailto:test@test.com'
          }
        })
        .execute(client)

      expect(result).toBeNull()
    })
  })
})
