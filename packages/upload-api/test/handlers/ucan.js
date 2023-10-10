import * as API from '../../src/types.js'
import { alice, bob, mallory } from '../util.js'
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

  'audience can revoke delegation': async (assert, context) => {
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
        issuer: alice,
        audience: context.id,
        with: alice.did(),
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

  'issuer can revoke downstream delegation': async (assert, context) => {
    const proof = await Console.log.delegate({
      issuer: context.id,
      audience: alice,
      with: context.id.did(),
    })

    const bad = await Console.log.delegate({
      issuer: alice,
      audience: bob,
      with: context.id.did(),
      proofs: [proof],
    })

    const good = await Console.log.delegate({
      issuer: alice,
      audience: mallory,
      with: context.id.did(),
      proofs: [proof],
    })

    const revoke = await UCAN.revoke
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          ucan: bad.cid,
        },
        proofs: [bad],
      })
      .execute(context.connection)

    assert.ok(revoke.out.ok?.time)

    const failure = await Console.log
      .invoke({
        issuer: bob,
        audience: context.id,
        with: context.id.did(),
        nb: { value: 'boom' },
        proofs: [bad],
      })
      .execute(context.connection)

    assert.ok(failure.out.error?.message.includes('has been revoked'))

    const success = await Console.log
      .invoke({
        issuer: mallory,
        audience: context.id,
        with: context.id.did(),
        nb: { value: 'works' },
        proofs: [good],
      })
      .execute(context.connection)

    assert.deepEqual(success.out, { ok: 'works' })
  },

  'offstream revocations does not apply': async (assert, context) => {
    const proof = await Console.log.delegate({
      issuer: context.id,
      audience: alice,
      with: context.id.did(),
    })

    // Bob can revoke but it won't apply since he's not in the delegation chain
    const revoke = await UCAN.revoke
      .invoke({
        issuer: bob,
        audience: context.id,
        with: bob.did(),
        nb: {
          ucan: proof.cid,
        },
        proofs: [proof],
      })
      .execute(context.connection)
    assert.ok(revoke.out.ok?.time)

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
  },

  'upstream revocations does not apply': async (assert, context) => {
    const root = await Console.console.delegate({
      issuer: context.id,
      audience: alice,
      with: context.id.did(),
    })

    const parent = await Console.log.delegate({
      issuer: alice,
      audience: bob,
      with: context.id.did(),
      proofs: [root],
    })

    const child = await Console.log.delegate({
      issuer: bob,
      audience: mallory,
      with: context.id.did(),
      proofs: [parent],
    })

    const revoke = await UCAN.revoke
      .invoke({
        issuer: bob,
        audience: context.id,
        with: bob.did(),
        nb: {
          ucan: root.cid,
        },
        proofs: [root],
      })
      .delegate()

    const [revocation] = await context.connection.execute(revoke)

    assert.ok(revocation.out.ok?.time)

    const revocations = await context.revocationsStorage.query({
      [root.cid.toString()]: {},
      [parent.cid.toString()]: {},
      [child.cid.toString()]: {},
    })

    assert.deepEqual(
      JSON.stringify(revocations.ok),
      JSON.stringify({
        [root.cid.toString()]: {
          [bob.did()]: {
            cause: revoke.cid,
          },
        },
      })
    )

    // even though bob is principal in the delegation chain, he is downstream
    // of the delegation he revoked, therefore his revocation does not apply

    const success = await Console.log
      .invoke({
        issuer: mallory,
        audience: context.id,
        with: context.id.did(),
        nb: { value: 'hello' },
        proofs: [child],
      })
      .execute(context.connection)

    assert.deepEqual(success.out, { ok: 'hello' })
  },
}
