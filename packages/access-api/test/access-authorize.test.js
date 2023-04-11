import {
  stringToDelegations,
  stringToDelegation,
  bytesToDelegations,
} from '@web3-storage/access/encoding'
import * as Access from '@web3-storage/capabilities/access'
import assert from 'assert'
import pWaitFor from 'p-wait-for'
import { Accounts } from '../src/models/accounts.js'
import { context } from './helpers/context.js'
// @ts-ignore
import isSubset from 'is-subset'
import * as DidMailto from '@web3-storage/did-mailto'
import {
  warnOnErrorResult,
  registerSpaces,
} from './helpers/ucanto-test-utils.js'
import { ed25519, Absentee } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { Space } from '@web3-storage/capabilities'

/** @type {typeof assert} */
const t = assert

describe('access/authorize', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  /** @type {{to:string, url:string}[]} */
  let outbox
  beforeEach(async function () {
    outbox = []
    ctx = await context({
      globals: {
        email: {
          /**
           * @param {*} email
           */
          sendValidation(email) {
            outbox.push(email)
          },
        },
      },
    })
  })

  it('should issue access/confirm', async function () {
    const { issuer, service, conn, d1 } = ctx
    const accountDID = 'did:mailto:dag.house:hello'

    const inv = await Access.authorize
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          iss: accountDID,
          att: [{ can: '*' }],
        },
      })
      .execute(conn)

    if (inv.error) {
      return assert.fail(inv.message)
    }

    const [email] = outbox
    assert.notEqual(email, undefined, 'no email was sent')

    const url = new URL(email.url)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessAuthorize]>} */ (
        url.searchParams.get('ucan')
      )
    const delegation = stringToDelegation(encoded)
    t.deepEqual(delegation.issuer.did(), service.did())
    t.deepEqual(delegation.audience.did(), service.did())
    t.deepEqual(delegation.capabilities, [
      {
        with: conn.id.did(),
        can: 'access/confirm',
        nb: {
          iss: accountDID,
          aud: issuer.did(),
          att: [{ can: '*' }],
        },
      },
    ])

    const accounts = new Accounts(d1)
    const acc = await accounts.get(accountDID)
    t.ok(
      isSubset(acc, {
        did: accountDID,
      })
    )
  })

  it('should validate have delegation in the email url', async function () {
    const { issuer, service, conn, mf } = ctx
    const accountDID = 'did:mailto:dag.house:email'

    const inv = await Access.authorize
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          iss: accountDID,
          att: [{ can: '*' }],
        },
      })
      .execute(conn)

    if (inv.error) {
      return assert.fail(inv.message)
    }

    const [email] = outbox
    if (!inv) {
      return assert.fail('no email was sent')
    }

    const url = new URL(email.url)
    const rsp = await mf.dispatchFetch(url, { method: 'POST' })
    assert.deepEqual(rsp.status, 200)

    const html = await rsp.text()
    assert(html.includes('Email Validated'))
    assert(html.includes(DidMailto.toEmail(accountDID)))
    assert(html.includes(issuer.did()))
  })

  // this relies on ./update that is no longer in ucanto
  it('should send confirmation email with link that, when clicked, allows for access/claim', async function () {
    const { issuer: agent, service, conn, mf } = ctx
    const accountDID = 'did:mailto:dag.house:email'

    const inv = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: accountDID,
          att: [{ can: '*' }],
        },
      })
      .execute(conn)

    assert.equal(inv.error, undefined, 'invocation should not fail')
    const [email] = outbox
    assert.notEqual(email, undefined, 'email was sent')

    const confirmEmailPostUrl = new URL(email.url)
    const confirmEmailPostResponse = await mf.dispatchFetch(
      confirmEmailPostUrl,
      { method: 'POST' }
    )
    assert.deepEqual(
      confirmEmailPostResponse.status,
      200,
      'confirmEmailPostResponse status is 200'
    )

    const claim = Access.claim.invoke({
      issuer: agent,
      audience: conn.id,
      with: agent.did(),
    })
    const claimResult = await claim.execute(conn)

    assert.ok(
      'delegations' in claimResult,
      'claimResult should have delegations property'
    )
    const claimedDelegations = Object.values(claimResult.delegations).flatMap(
      (bytes) => {
        return bytesToDelegations(
          /** @type {import('@web3-storage/access/src/types.js').BytesDelegation} */ (
            bytes
          )
        )
      }
    )
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
      with: accountDID,
      proofs: claimedDelegations,
    })
    const claimAsAccountResult = await claimAsAccount.execute(conn)
    warnOnErrorResult(claimAsAccountResult)
    assert.notDeepEqual(
      claimAsAccountResult.error,
      true,
      'claimAsAccountResult should not error'
    )
    assert.ok(
      'delegations' in claimAsAccountResult,
      'claimAsAccountResult should have delegations property'
    )
    const claimedAsAccountDelegations = Object.values(
      claimAsAccountResult.delegations
    )
    assert.deepEqual(claimedAsAccountDelegations.length, 0)
  })

  it('should receive delegation in the ws', async function () {
    const { issuer: agent, service, conn, mf } = ctx
    const accountDID = 'did:mailto:dag.house:email'

    const inv = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: accountDID,
          att: [{ can: '*' }],
        },
      })
      .execute(conn)

    if (inv.error) {
      return assert.fail(inv.message)
    }

    const [email] = outbox
    assert.notEqual(email, undefined, 'email was sent')

    const url = new URL(email.url)
    // click email url
    await mf.dispatchFetch(url, { method: 'POST' })

    // ws
    const res = await mf.dispatchFetch('http://localhost:8787/validate-ws', {
      headers: { Upgrade: 'websocket' },
    })

    const webSocket = res.webSocket
    if (webSocket) {
      let done = false
      webSocket.accept()
      webSocket.addEventListener('message', (event) => {
        // @ts-ignore
        const data = JSON.parse(event.data)

        const encoded =
          /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessSession]>} */ (
            data.delegation
          )

        assert.ok(encoded)
        const [authorization, attestation] = stringToDelegations(encoded)

        assert.equal(authorization.issuer.did(), accountDID)
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

        done = true
      })

      webSocket.send(
        JSON.stringify({
          did: agent.did(),
        })
      )

      await pWaitFor(() => done)
    } else {
      assert.fail('should have ws')
    }
  })

  it('should receive account delegations', async () => {
    const space = await ed25519.generate()
    const w3 = ctx.service

    const account = Absentee.from({ id: 'did:mailto:dag.house:test' })
    await registerSpaces([space], {
      ...ctx,
      agent: ctx.issuer,
      account,
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
        audience: w3,
        with: space.did(),
        nb: {
          delegations: {
            [delegation.cid.toString()]: delegation.cid,
          },
        },
        proofs: [delegation],
      })
      .execute(ctx.conn)

    warnOnErrorResult(delegateResult)
    assert.equal(delegateResult.error, undefined, 'delegation succeeded')

    // Now generate an agent and try to authorize with the account
    const agent = await ed25519.generate()
    const auth = await Access.authorize
      .invoke({
        issuer: agent,
        audience: w3,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(ctx.conn)

    assert.equal(auth.error, undefined, 'authorize succeeded')

    // now we are going to complete authorization flow following the email link
    const [email] = outbox
    assert.notEqual(email, undefined, 'email was sent')
    const confirmEmailPostUrl = new URL(email.url)
    const confirmEmailPostResponse = await ctx.mf.dispatchFetch(
      confirmEmailPostUrl,
      { method: 'POST' }
    )
    assert.deepEqual(
      confirmEmailPostResponse.status,
      200,
      'confirmEmailPostResponse status is 200'
    )

    // we can use delegations to invoke access/claim with=accountDID
    const claim = await Access.claim
      .invoke({
        issuer: agent,
        audience: w3,
        with: agent.did(),
      })
      .execute(ctx.conn)

    if (claim.error) {
      assert.fail('claim succeeded')
    }

    const delegations = Object.values(claim.delegations).map((bytes) => {
      return bytesToDelegations(
        /** @type {import('@web3-storage/access/src/types.js').BytesDelegation} */ (
          bytes
        )
      )[0]
    })

    const [attestation, authorization] =
      delegations[0].issuer.did() === w3.did()
        ? delegations
        : delegations.reverse()

    assert.deepEqual(attestation.capabilities, [
      {
        can: 'ucan/attest',
        with: w3.did(),
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
        audience: w3,
        with: space.did(),
        proofs: [authorization, attestation],
      })
      .execute(ctx.conn)
    assert.notDeepEqual(info.error, true, 'space/info did not error')
  })
})
