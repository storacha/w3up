import * as API from '../../types.js'
import { Absentee } from '@ucanto/principal'
import * as Server from '@ucanto/server'
import { Access } from '@storacha/capabilities'
import { alice, bob, mallory, provisionProvider } from '../../helpers/utils.js'
import * as delegationsResponse from '../../../src/utils/delegations-response.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'access/delegate 0 delegations': async (assert, context) => {
    const { connection, service, space } = await setup(context)
    const proof = await Access.delegate.delegate({
      issuer: space,
      audience: bob,
      with: space.did(),
    })

    const invocation = Access.delegate.invoke({
      issuer: bob,
      audience: service,
      with: space.did(),
      nb: {
        delegations: {},
      },
      proofs: [proof],
    })

    const receipt = await invocation.execute(connection)
    assert.deepEqual(receipt.out, { ok: {} }, 'success')
  },
  'access/delegate 1 delegation': async (assert, context) => {
    const { connection, space, service } = await setup(context)
    const delegation = await Server.delegate({
      issuer: bob,
      audience: mallory,
      capabilities: [
        {
          with: mallory.did(),
          can: 'test/something',
        },
      ],
    })

    const invocation = Access.delegate.invoke({
      issuer: space,
      audience: service,
      with: space.did(),
      nb: {
        delegations: {
          [`${delegation.cid}`]: delegation.cid,
        },
      },
      proofs: [delegation],
    })

    const receipt = await invocation.execute(connection)
    assert.deepEqual(receipt.out, { ok: {} }, 'success')

    const claim = Access.claim.invoke({
      issuer: mallory,
      audience: service,
      with: mallory.did(),
    })

    const claimReceipt = await claim.execute(connection)
    assert.ok(claimReceipt.out.ok, 'success')
    assert.equal(Object.keys(claimReceipt.out.ok?.delegations || {}).length, 1)
  },
  'InsufficientStorage if DID in the with field has no storage provider':
    async (assert, context) => {
      const invocation = Access.delegate.invoke({
        issuer: alice,
        audience: context.service,
        with: alice.did(),
        nb: {
          delegations: {},
        },
      })

      const { out } = await invocation.execute(context.connection)
      assert.ok(out.error, 'invocation fails')
      assert.equal(out.error?.name, 'InsufficientStorage')
      assert.ok(
        out.error?.message.includes('has no storage provider'),
        'InsufficientStorage message indicates that it is because there is no storage provider'
      )
    },
  'can claim delegation': async (assert, context) => {
    const { connection, space, delegation, service } = await setup(context)

    const delegate = await Access.delegate
      .invoke({
        issuer: space,
        audience: service,
        with: space.did(),
        nb: {
          delegations: {
            [`${delegation.cid}`]: delegation.cid,
          },
        },
        proofs: [delegation],
      })
      .execute(connection)

    assert.ok(delegate.out.ok, 'delegation ok')

    const claim = await Access.claim
      .invoke({
        issuer: mallory,
        audience: service,
        with: mallory.did(),
      })
      .execute(connection)

    assert.ok(claim.out.ok, 'claim ok')

    const received = [
      ...delegationsResponse.decode(claim.out.ok?.delegations || {}),
    ]

    assert.deepEqual(
      received.map((d) => d.cid.toString()),
      [delegation.cid.toString()],
      'claimed all delegated delegations'
    )
  },
  "UnknownDelegation if delegation isn't included": async (assert, context) => {
    const { connection, delegation, space, service } = await setup(context)

    const delegate = await Access.delegate
      .invoke({
        issuer: space,
        audience: service,
        with: space.did(),
        nb: {
          delegations: {
            [`${delegation.cid}`]: delegation.cid,
          },
        },
      })
      .execute(connection)

    assert.ok(delegate.out.error, 'delegation failed')
    assert.deepEqual(delegate.out.error?.name, 'DelegationNotFound')
  },
}

/**
 * @param {API.TestContext} context
 */
const setup = async (context) => {
  const space = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = bob

  const delegation = await Server.delegate({
    issuer: bob,
    audience: mallory,
    capabilities: [
      {
        with: mallory.did(),
        can: 'store/add',
      },
    ],
  })

  await provisionProvider({
    ...context,
    space,
    agent,
    account,
  })

  return { space, agent, account, delegation, ...context }
}
