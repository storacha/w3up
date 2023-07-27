import * as API from '../types.js'
import { Absentee } from '@ucanto/principal'
import { alice, bob } from '../helpers/utils.js'
import { RateLimit } from '@web3-storage/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'rate-limit/add can be invoked': async (assert, context) => {
    const { service, agent, space, connection } = await setup(context)

    const result = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
          rate: 0,
        },
      })
      .execute(connection)

    assert.ok(result.out.ok)
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
