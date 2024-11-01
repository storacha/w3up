import * as API from '../../types.js'
import { alice, bob } from '../../helpers/utils.js'
import { Absentee } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { RateLimit } from '@storacha/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'rate-limit/remove removes rate limits': async (assert, context) => {
    const { service, agent, space, connection } = await setup(context)

    // add a rate limit
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

    // verify it's there
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
    assert.equal(listResult.out.ok?.limits.length, 1)

    // remove a rate limit
    const removeResult = await RateLimit.remove
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          // @ts-ignore we've verified this exists but TS doesn't know that
          id: result.out.ok.id,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/remove' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(removeResult.out.ok)

    // verify it's gone
    const listResult2 = await RateLimit.list
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
        },
        nonce: '2',
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/list' }],
          }),
        ],
      })
      .execute(connection)
    assert.equal(listResult2.out.ok?.limits.length, 0)
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
