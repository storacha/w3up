import * as API from '../../src/types.js'
import { alice } from '../util.js'
import { UCAN, Console } from '@web3-storage/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'issuer can revoke delegation': async (assert, context) => {
    const proof = await Console.log.delegate({
      issuer: context.id,
      audience: alice,
      with: context.id.did(),
    })

    const success = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: context.id.did(),
        nb: { value: 'hello' },
        proofs: [proof],
      })
      .execute(context.connection)

    assert.deepEqual(success.out, { ok: 'hello' })

    const revoke = await UCAN.revoke
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          ucan: proof.cid,
        },
        proofs: [proof],
      })
      .execute(context.connection)

    assert.ok(revoke.out.ok?.time)

    const failure = await Console.log
      .invoke({
        issuer: alice,
        audience: context.id,
        with: context.id.did(),
        nb: { value: 'bye' },
        proofs: [proof],
      })
      .execute(context.connection)

    assert.ok(failure.out.error?.message.includes('has been revoked'))
  },
}
