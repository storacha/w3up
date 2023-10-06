import * as API from '../../src/types.js'
import { randomCID } from '../util.js'
import { createSampleDelegation } from '../../src/utils/ucan.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'can add and retrieve revocations': async (assert, context) => {
    const storage = context.revocationsStorage
    const badDelegation = await createSampleDelegation()
    const scopeDelegation = await createSampleDelegation()
    const invocationCID = await randomCID()

    const { ok: revoked } = await storage.getAll([scopeDelegation.cid, badDelegation.cid])
    assert.deepEqual(revoked, [])

    await storage.addAll([{
      revoke: badDelegation.cid,
      scope: scopeDelegation.cid,
      cause: invocationCID
    }])

    // it should return revocations that have been recorded
    const { ok: revocationsToMeta } = await storage.getAll([badDelegation.cid])
    assert.deepEqual(revocationsToMeta, [
      { revoke: badDelegation.cid, scope: scopeDelegation.cid, cause: invocationCID }
    ])

    // it should not return revocations that have not been recorded
    const { ok: noRevocations } = await storage.getAll([scopeDelegation.cid])
    assert.deepEqual(noRevocations, [])

    // it should return revocations that have been recorded
    const { ok: someRevocations } = await storage.getAll([badDelegation.cid, scopeDelegation.cid])
    assert.deepEqual(someRevocations, [
      { revoke: badDelegation.cid, scope: scopeDelegation.cid, cause: invocationCID }
    ])

    // if we revoke from and alternate scope
    const alternateScopeDelegation = await createSampleDelegation()
    const secondInvocationCID = await randomCID()
    await storage.addAll([{
      revoke: badDelegation.cid,
      scope: alternateScopeDelegation.cid,
      cause: secondInvocationCID
    }])

    // it should return both revocations
    const { ok: moreRevocations } = await storage.getAll([badDelegation.cid])
    assert.deepEqual(moreRevocations, [
      { revoke: badDelegation.cid, scope: scopeDelegation.cid, cause: invocationCID },
      { revoke: badDelegation.cid, scope: alternateScopeDelegation.cid, cause: secondInvocationCID }
    ])
  }
}
