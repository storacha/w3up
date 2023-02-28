import { stringToDelegation } from '@web3-storage/access/encoding'
import * as Access from '@web3-storage/capabilities/access'
import assert from 'assert'
import pWaitFor from 'p-wait-for'
import { Accounts } from '../src/models/accounts.js'
import { context } from './helpers/context.js'
// @ts-ignore
import isSubset from 'is-subset'
import { toEmail } from '../src/utils/did-mailto.js'

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
    const claimedDelegations = claimResult.delegations
    assert.deepEqual(
      Object.values(claimedDelegations).length,
      1,
      'should have claimed 1 delegation'
    )

    let accessDelegateError
    /** @type {undefined|import('@ucanto/interface').Result<import('@web3-storage/capabilities/types').AccessDelegateSuccess, import('@web3-storage/capabilities/types').AccessDelegateFailure>} */
    let accessDelegateResult
    try {
      accessDelegateResult = await Access.delegate
        .invoke({
          issuer,
          audience: conn.id,
          with: issuer.did(),
          nb: {
            delegations: {},
          },
        })
        .execute(conn)
    } catch (error) {
      accessDelegateError = error
    }
    // eslint-disable-next-line unicorn/no-useless-undefined
    assert.deepEqual(accessDelegateError, undefined)
    assert.ok(accessDelegateResult, 'access/delegate should have result')
    assert.deepEqual(
      typeof accessDelegateResult === 'object' &&
        'name' in accessDelegateResult &&
        accessDelegateResult.name,
      'InsufficientStorage',
      'access/delegate should fail with InsufficientStorage'
    )

    // @todo once provider/add is implemented, use it to add a storage provider,
    // then `access/delegate` invocations should get a non-error result
    // https://github.com/web3-storage/w3protocol/issues/459
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
