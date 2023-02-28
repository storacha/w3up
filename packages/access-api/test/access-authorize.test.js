import {
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
import { toEmail } from '../src/utils/did-mailto.js'
import { warnOnErrorResult } from './helpers/ucanto-test-utils.js'

/** @type {typeof assert} */
const t = assert

describe('access/authorize', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })

  it('should issue ./update', async function () {
    const { issuer, service, conn, d1 } = ctx
    const accountDID = 'did:mailto:dag.house:hello'

    const inv = await Access.authorize
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          as: accountDID,
        },
      })
      .execute(conn)

    if (!inv) {
      return assert.fail('no output')
    }
    if (inv.error) {
      return assert.fail(inv.message)
    }

    const url = new URL(inv)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessSession]>} */ (
        url.searchParams.get('ucan')
      )
    const delegation = stringToDelegation(encoded)
    t.deepEqual(delegation.issuer.did(), service.did())
    t.deepEqual(delegation.audience.did(), accountDID)
    t.deepEqual(delegation.capabilities[0].nb.key, issuer.did())
    t.deepEqual(delegation.capabilities[0].with, service.did())
    t.deepEqual(delegation.capabilities[0].can, './update')

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
          as: accountDID,
        },
      })
      .execute(conn)

    if (!inv) {
      return assert.fail('no output')
    }
    if (inv.error) {
      return assert.fail(inv.message)
    }

    const url = new URL(inv)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').AccessSession]>} */ (
        url.searchParams.get('ucan')
      )
    const rsp = await mf.dispatchFetch(url, { method: 'POST' })
    const html = await rsp.text()

    assert(html.includes(encoded))
    assert(html.includes(toEmail(accountDID)))
  })

  it('should send confirmation email with link that, when clicked, allows for access/claim', async function () {
    const { issuer, service, conn, mf } = ctx
    const accountDID = 'did:mailto:dag.house:email'

    const inv = await Access.authorize
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          as: accountDID,
        },
      })
      .execute(conn)

    // @todo - this only returns string when ENV==='test'. Remove that env-specific behavior
    assert.ok(typeof inv === 'string', 'invocation result is a string')

    const confirmEmailPostUrl = new URL(inv)
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
      issuer,
      audience: conn.id,
      with: issuer.did(),
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
    /**
     * narrow Ucanto.Proof to Ucanto.Delegation
     *
     * @param {import('@ucanto/interface').Proof} proof
     */
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const proofDelegation = (proof) => {
      if (!('cid' in proof)) {
        throw new Error('proof must be delegation')
      }
      return proof
    }
    const attest = claimedDelegations.find(
      (d) => proofDelegation(d.proofs[0])?.issuer.did() === accountDID
    )
    assert.ok(
      attest,
      'should claim ucan/attest delegation with proof.iss=accountDID'
    )
    assert.deepEqual(attest.issuer.did(), service.did())
    assert.deepEqual(attest.audience.did(), issuer.did())
    assert.deepEqual(attest.capabilities[0].can, 'ucan/attest')
    assert.deepEqual(attest.capabilities[0].with, service.did())

    // ucan/attest nb.proof can be decoded into a delegation
    const claimedNb = attest.capabilities[0].nb
    assert.ok(
      claimedNb && typeof claimedNb === 'object' && 'proof' in claimedNb,
      'should have nb.proof'
    )
    const expectAccountToKey = proofDelegation(attest.proofs[0])
    assert.ok(expectAccountToKey, 'expect proofs to contain delegation')
    assert.deepEqual(expectAccountToKey.issuer.did(), accountDID)
    assert.deepEqual(expectAccountToKey.audience.did(), issuer.did())
    assert.deepEqual(expectAccountToKey.capabilities, [
      { can: '*', with: 'ucan:*' },
    ])

    const attestIssService = claimedDelegations.find(
      (d) => proofDelegation(d.proofs[0])?.issuer.did() === service.did()
    )
    assert.ok(
      attestIssService,
      'should claim ucan/attest with proof.iss=service'
    )
    const accountAuthorization = attestIssService.proofs[0]
    const account = issuer.withDID(accountDID)
    const claimAsAccount = Access.claim.invoke({
      issuer: account,
      audience: service,
      with: account.did(),
      proofs: [accountAuthorization],
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
  })

  it('should receive delegation in the ws', async function () {
    const { issuer, service, conn, mf } = ctx
    const accountDID = 'did:mailto:dag.house:email'

    const inv = await Access.authorize
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          as: accountDID,
        },
      })
      .execute(conn)

    if (!inv) {
      return assert.fail('no output')
    }
    if (inv.error) {
      return assert.fail(inv.message)
    }

    const url = new URL(inv)
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
        const delegation = stringToDelegation(encoded)
        t.deepEqual(delegation.issuer.did(), service.did())
        t.deepEqual(delegation.audience.did(), accountDID)
        t.deepEqual(delegation.capabilities[0].nb.key, issuer.did())
        t.deepEqual(delegation.capabilities[0].with, service.did())
        t.deepEqual(delegation.capabilities[0].can, './update')
        done = true
      })

      webSocket.send(
        JSON.stringify({
          did: issuer.did(),
        })
      )

      await pWaitFor(() => done)
    } else {
      assert.fail('should have ws')
    }
  })
})
