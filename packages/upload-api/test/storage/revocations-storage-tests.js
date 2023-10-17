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

    const notFound = await storage.query({
      [proofRevocation.cid.toString()]: {},
      [badRevocation.cid.toString()]: {},
    })

    assert.deepEqual(notFound, { ok: {} })

    await storage.add({
      revoke: badRevocation.cid,
      scope: badRevocation.issuer.did(),
      cause: invocationCID,
    })

    // it should return revocations that have been recorded
    const exactMatch = await storage.query({
      [badRevocation.cid.toString()]: {},
    })

    assert.deepEqual(exactMatch, {
      ok: {
        [badRevocation.cid.toString()]: {
          [badRevocation.issuer.did()]: {
            cause: invocationCID,
          },
        },
      },
    })

    // it should not return revocations that have not been recorded
    const nomatch = await storage.query({
      [proofRevocation.cid.toString()]: {},
    })

    assert.deepEqual(nomatch, { ok: {} })

    // it should return revocations that have been recorded
    const partialMatch = await storage.query({
      [badRevocation.cid.toString()]: {},
      [proofRevocation.cid.toString()]: {},
    })

    assert.deepEqual(partialMatch, {
      ok: {
        [badRevocation.cid.toString()]: {
          [badRevocation.issuer.did()]: {
            cause: invocationCID,
          },
        },
      },
    })
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

    assert.deepEqual(await storage.query({ [revoke.toString()]: {} }), {
      ok: {
        [revoke.toString()]: {
          [alice.did()]: {
            cause,
          },
          [bob.did()]: {
            cause,
          },
        },
      },
    })

    await storage.reset({
      revoke,
      cause,
      scope: mallory.did(),
    })

    assert.deepEqual(await storage.query({ [revoke.toString()]: {} }), {
      ok: {
        [revoke.toString()]: {
          [mallory.did()]: {
            cause,
          },
        },
      },
    })
  },
}
