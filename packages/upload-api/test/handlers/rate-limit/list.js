import * as API from '../../types.js'
import { alice, bob } from '../../helpers/utils.js'
import { Absentee } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { RateLimit } from '@storacha/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'rate-limit/list shows existing rate limits': async (assert, context) => {
    const { service, agent, space, connection } = await setup(context)

    // create a rate limit
    const result = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)
    assert.ok(result.out.ok)

    // ensure the created rate limit shows up in list
    const listResult = await RateLimit.list
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/list' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(result.out.ok)
    assert.equal(listResult.out.ok?.limits.length, 1)
    assert.equal(listResult.out.ok?.limits[0].id, result.out.ok?.id)
  },
}

/**
 * @param {API.TestContext} context
 */
const setup = async (context) => {
  const space = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = bob

  return { space, account, agent, ...context }
}
