import * as API from './types.js'
import { Absentee } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { Access, Customer, Space } from '@web3-storage/capabilities'
import { alice, bob, provisionProvider } from './helpers/utils.js'
import * as DidMailto from '@web3-storage/did-mailto'
import {
  stringToDelegations,
  stringToDelegation,
  bytesToDelegations,
} from '@web3-storage/access/encoding'

/**
 * @type {API.Tests}
 */
export const test = {
  'should issue access/confirm': async (assert, context) => {
    const { space, account, service, mail, connection } = await setup(context)

    const inv = await Access.authorize
      .invoke({
        issuer: space,
        audience: service,
        with: space.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.equal(inv.out.error, undefined)

    const email = await mail.take()
    assert.ok(email, 'email was sent')

    const url = new URL(email.url)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessConfirm]>} */ (
        url.searchParams.get('ucan')
      )
    const delegation = stringToDelegation(encoded)
    assert.deepEqual(delegation.issuer.did(), service.did())
    assert.deepEqual(delegation.audience.did(), service.did())
    assert.deepEqual(delegation.capabilities, [
      {
        can: 'access/confirm',
        with: service.did(),
        nb: {
          iss: account.did(),
          aud: space.did(),
          att: [{ can: '*' }],
        },
      },
    ])

    const customer = await Customer.get
      .invoke({
        issuer: service,
        audience: service,
        with: service.did(),
        nb: {
          customer: account.did(),
        },
      })
      .execute(connection)

    assert.deepEqual(
      customer.out.ok?.customer?.did,
      account.did(),
      'account is a customer'
    )
  },

  'should validate have delegation in the email url': async (
    assert,
    context
  ) => {
    const { account, agent, service, mail, connection } = await setup(context)
    const auth = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.equal(auth.out.error, undefined, 'should not fail')
    const email = await mail.take()
    assert.ok(email, 'email was sent')

    const rsp = await context.fetch(email.url, { method: 'POST' })

    assert.deepEqual(rsp.status, 200)
    const html = await rsp.text()
    assert.ok(html.includes('Email Validated'))
    assert.ok(html.includes(DidMailto.toEmail(account.did())))
    assert.ok(html.includes(agent.did()))
  },

  'should send confirmation email with link that, when clicked, allows for access/claim':
    async (assert, context) => {
      const { agent, account, service, mail, connection } = await setup(context)

      const auth = await Access.authorize
        .invoke({
          issuer: agent,
          audience: service,
          with: agent.did(),
          nb: {
            iss: account.did(),
            att: [{ can: '*' }],
          },
        })
        .execute(connection)

      assert.equal(auth.out.error, undefined, 'invocation should not fail')
      const email = await mail.take()
      assert.ok(email, 'email was sent')

      const confirmEmailPostResponse = await context.fetch(email.url, {
        method: 'POST',
      })

      assert.deepEqual(
        confirmEmailPostResponse.status,
        200,
        'confirmEmailPostResponse status is 200'
      )

      const claim = Access.claim.invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
      })
      const claimResult = await claim.execute(connection)

      assert.ok(claimResult.out.ok)
      assert.ok(
        claimResult.out.ok?.delegations,
        'claimResult should have delegations property'
      )

      const claimedDelegations = Object.values(
        claimResult.out.ok?.delegations || {}
      ).flatMap((bytes) => {
        return bytesToDelegations(bytes)
      })

      assert.deepEqual(
        claimedDelegations.length,
        2,
        'should have claimed delegation(s)'
      )

      const claimedDelegationIssuedByService = claimedDelegations.find((d) => {
        if (!('cid' in d)) {
          throw new Error('proof must be delegation')
        }
        return d.issuer.did() === service.did()
      })

      assert.ok(
        claimedDelegationIssuedByService,
        'should claim ucan/attest with proof.iss=service'
      )

      // we can use delegations to invoke access/claim with=accountDID
      const claimAsAccount = Access.claim.invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        proofs: claimedDelegations,
      })
      const claimAsAccountResult = await claimAsAccount.execute(connection)

      assert.ok(
        claimAsAccountResult.out.ok,
        'claimAsAccountResult should not error'
      )
      assert.ok(
        claimAsAccountResult.out.ok?.delegations,
        'claimAsAccountResult should have delegations property'
      )

      const claimedAsAccountDelegations = Object.values(
        claimAsAccountResult.out.ok?.delegations || {}
      )
      assert.deepEqual(claimedAsAccountDelegations.length, 0)
    },

  'should receive delegation in the ws': async (assert, context) => {
    const { account, agent, service, mail, connection } = await setup(context)

    const auth = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.equal(auth.out.error, undefined, 'should not fail')
    const email = await mail.take()
    assert.ok(email, 'email was sent')

    // click email url
    await context.fetch(email.url, { method: 'POST' })

    // ws
    const webSocket = await context.webSocket(
      'http://localhost:8787/validate-ws'
    )

    const event = new Promise((resolve) =>
      webSocket.addEventListener('message', resolve)
    )
    webSocket.send(
      JSON.stringify({
        did: agent.did(),
      })
    )

    const message = await event
    const data = JSON.parse(message.data)

    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessSession]>} */ (
        data.delegation
      )

    assert.ok(encoded)
    const [authorization, attestation] = stringToDelegations(encoded)

    assert.equal(authorization.issuer.did(), account.did())
    assert.equal(authorization.audience.did(), agent.did())
    assert.equal(authorization.expiration, Infinity)
    assert.deepEqual(authorization.capabilities, [
      {
        can: '*',
        with: 'ucan:*',
      },
    ])

    assert.equal(attestation.issuer.did(), service.did())
    assert.equal(attestation.audience.did(), agent.did())
    assert.equal(attestation.expiration, Infinity)
    assert.deepEqual(attestation.capabilities, [
      {
        can: 'ucan/attest',
        with: service.did(),
        nb: {
          proof: authorization.cid,
        },
      },
    ])
  },

  'should receive account delegations': async (assert, context) => {
    const { space, account, agent, service, mail, connection } = await setup(
      context
    )

    await provisionProvider({
      service,
      agent,
      space,
      account,
      connection,
    })

    // delegate all space capabilities to the account
    const delegation = await delegate({
      issuer: space,
      audience: account,
      capabilities: [
        {
          with: space.did(),
          can: '*',
        },
      ],
    })

    // send above delegation to the service so it can be claimed.
    const delegateResult = await Access.delegate
      .invoke({
        issuer: space,
        audience: service,
        with: space.did(),
        nb: {
          delegations: {
            [delegation.cid.toString()]: delegation.cid,
          },
        },
        proofs: [delegation],
      })
      .execute(connection)

    assert.equal(delegateResult.out.error, undefined, 'delegation succeeded')

    const auth = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.equal(auth.out.error, undefined, 'authorize succeeded')

    // now we are going to complete authorization flow following the email link
    const email = await mail.take()
    assert.ok(email, 'email was sent')
    const confirmEmailPostResponse = await context.fetch(email.url, {
      method: 'POST',
    })
    assert.deepEqual(
      confirmEmailPostResponse.status,
      200,
      'confirmEmailPostResponse status is 200'
    )

    // we can use delegations to invoke access/claim with=accountDID
    const claim = await Access.claim
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
      })
      .execute(connection)

    assert.ok(claim.out.ok, 'claim should not error')
    const delegations = Object.values(claim.out.ok?.delegations || {}).map(
      (bytes) => {
        return bytesToDelegations(bytes)[0]
      }
    )

    const [attestation, authorization] =
      delegations[0].issuer.did() === service.did()
        ? delegations
        : delegations.reverse()

    assert.deepEqual(attestation.capabilities, [
      {
        can: 'ucan/attest',
        with: service.did(),
        nb: {
          proof: authorization.cid,
        },
      },
    ])

    assert.equal(authorization.issuer.did(), account.did())
    assert.deepEqual(authorization.capabilities, [
      {
        can: '*',
        with: 'ucan:*',
      },
    ])

    assert.deepEqual(
      // @ts-expect-error - it could be a link but we know it's delegation
      authorization.proofs[0].cid,
      delegation.cid,
      'delegation to an account is included'
    )

    // use these delegations to do something on the space
    const info = await Space.info
      .invoke({
        issuer: agent,
        audience: service,
        with: space.did(),
        proofs: [authorization, attestation],
      })
      .execute(connection)
    assert.ok(info.out.ok, 'space/info did not error')
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
