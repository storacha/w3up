import * as API from '../../types.js'
import { Absentee } from '@ucanto/principal'
import { Access } from '@storacha/capabilities'
import { alice, bob } from '../../helpers/utils.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'access/claim can be invoked': async (assert, context) => {
    const { service, agent, connection } = await setup(context)
    const claim = await Access.claim
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
      })
      .execute(connection)

    assert.ok(claim.out.ok)
    assert.ok(claim.out.ok?.delegations, 'contains delegations set')
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
