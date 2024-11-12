import * as API from '../../src/types.js'
import { createServer, connect } from '../../src/lib.js'
import { alice } from '../util.js'
import { Plan } from '@storacha/capabilities'
import { createAuthorization } from '../helpers/utils.js'
import { Absentee } from '@ucanto/principal'

/**
 * @type {API.Tests}
 */
export const test = {
  'an account can get plan information': async (assert, context) => {
    const account = 'did:mailto:example.com:alice'
    const billingID = 'stripe:abc123'
    const product = 'did:web:test.upload.storacha.network'
    await context.plansStorage.initialize(account, billingID, product)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })
    const result = await Plan.get
      .invoke({
        issuer: alice,
        audience: context.service,
        with: account,
        proofs: await createAuthorization({
          agent: alice,
          account: Absentee.from({ id: account }),
          service: context.service,
        }),
      })
      .execute(connection)

    assert.ok(result.out.ok)
    assert.equal(result.out.ok?.product, product)
    assert.ok(result.out.ok?.updatedAt)
    const date = /** @type {string} */ (result.out.ok?.updatedAt)
    assert.equal(new Date(Date.parse(date)).toISOString(), date)
  },
}
