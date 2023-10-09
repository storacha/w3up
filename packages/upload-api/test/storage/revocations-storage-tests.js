import * as API from '../../src/types.js'
import { randomCID } from '../util.js'
import { createSampleDelegation } from '../../src/utils/ucan.js'
import { alice, bob, mallory } from '../util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'can add and retrieve revocations': async (assert, context) => {
    const storage = context.revocationsStorage
    const badRevocation = await createSampleDelegation()
    const proofRevocation = await createSampleDelegation()
    const invocationCID = await randomCID()

    const { ok: revoked } = await storage.getAll([
      proofRevocation.cid,
      badRevocation.cid,
    ])
    assert.deepEqual(revoked, [])

    await storage.add({
      revoke: badRevocation.cid,
      scope: badRevocation.issuer.did(),
      cause: invocationCID,
    })

    // it should return revocations that have been recorded
    const { ok: revocationsToMeta } = await storage.getAll([badRevocation.cid])
    assert.deepEqual(revocationsToMeta, [
      {
        revoke: badRevocation.cid,
        scope: badRevocation.issuer.did(),
        cause: invocationCID,
      },
    ])

    // it should not return revocations that have not been recorded
    const { ok: noRevocations } = await storage.getAll([proofRevocation.cid])
    assert.deepEqual(noRevocations, [])

    // it should return revocations that have been recorded
    const { ok: someRevocations } = await storage.getAll([
      badRevocation.cid,
      proofRevocation.cid,
    ])
    assert.deepEqual(someRevocations, [
      {
        revoke: badRevocation.cid,
        scope: badRevocation.issuer.did(),
        cause: invocationCID,
      },
    ])
  },

  'can reset revocations': async (assert, context) => {
    const storage = context.revocationsStorage
    const { cid: revoke } = await createSampleDelegation()
    const cause = await randomCID()

    await storage.add({
      cause,
      revoke,
      scope: alice.did(),
    })
    await storage.add({
      cause,
      revoke,
      scope: bob.did(),
    })

    assert.deepEqual(await storage.getAll([revoke]), {
      ok: [
        {
          revoke,
          cause,
          scope: alice.did(),
        },
        {
          revoke,
          cause,
          scope: bob.did(),
        },
      ],
    })

    await storage.reset({
      revoke,
      cause,
      scope: mallory.did(),
    })

    assert.deepEqual(await storage.getAll([revoke]), {
      ok: [
        {
          revoke,
          cause,
          scope: mallory.did(),
        },
      ],
    })
  },
}
