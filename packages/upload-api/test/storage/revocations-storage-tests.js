import * as API from '../../src/types.js'
import { randomCID } from '../util.js'
import { createSampleDelegation } from '../../src/utils/ucan.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'can add and retrieve revocations': async (assert, context) => {
    const storage = context.revocationsStorage
    const badRevocation = await createSampleDelegation()
    const proofRevocation = await createSampleDelegation()
    const invocationCID = await randomCID()

    const { ok: revoked } = await storage.getAll([proofRevocation.cid, badRevocation.cid])
    assert.deepEqual(revoked, [])

    await storage.addAll([{ revoke: badRevocation.cid, scope: proofRevocation.cid, cause: invocationCID }])

    // it should return revocations that have been recorded
    const { ok: revocationsToMeta } = await storage.getAll([badRevocation.cid])
    assert.deepEqual(revocationsToMeta, [
      { revoke: badRevocation.cid, scope: proofRevocation.cid, cause: invocationCID }
    ])

    // it should not return revocations that have not been recorded
    const { ok: noRevocations } = await storage.getAll([proofRevocation.cid])
    assert.deepEqual(noRevocations, [])

    // it should return revocations that have been recorded
    const { ok: someRevocations } = await storage.getAll([badRevocation.cid, proofRevocation.cid])
    assert.deepEqual(someRevocations, [
      { revoke: badRevocation.cid, scope: proofRevocation.cid, cause: invocationCID }
    ])

  }
}
