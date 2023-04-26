import { Delegation, invoke } from '@ucanto/core'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context } from './helpers/context.js'
import assert from 'assert'
import * as principal from '@ucanto/principal'

/** @type {typeof assert} */
const t = assert
const test = it

describe('ucan', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })

  test('should voucher/claim', async function () {
    const { issuer, service, conn } = ctx

    const inv = await Voucher.claim
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          identity: 'mailto:email@dag.house',
          product: 'product:free',
          service: service.did(),
        },
      })
      .execute(conn)

    if (!inv) {
      return t.fail('no output')
    }
    if (inv.out.error) {
      return t.fail(inv.out.error.message)
    }

    // @ts-expect-error for tests out comes as a string
    const delegation = stringToDelegation(inv.out.ok.encoded)

    t.deepEqual(delegation.issuer.did(), service.did())
    t.deepEqual(delegation.audience.did(), issuer.did())
    // @ts-expect-error TODO unknown type
    t.deepEqual(delegation.capabilities[0].nb.space, issuer.did())
    // @ts-expect-error TODO unknown type
    t.deepEqual(delegation.capabilities[0].nb.product, 'product:free')
    t.deepEqual(
      // @ts-expect-error TODO unknown type
      delegation.capabilities[0].nb.identity,
      'mailto:email@dag.house'
    )

    if (Delegation.isDelegation(delegation.proofs[0])) {
      t.deepEqual(delegation.proofs[0].issuer.did(), service.did())
      t.deepEqual(delegation.proofs[0].capabilities, [
        {
          with: service.did(),
          can: 'voucher/redeem',
          nb: {
            space: 'did:*',
            identity: 'mailto:*',
            product: 'product:*',
          },
        },
      ])
    } else {
      t.fail('proof should be a delegation')
    }
  })
})

describe('voucher/claim', () => {
  it('invoking delegation from confirmation email should not error', async () => {
    const { service, conn } = await context()
    const issuer = await principal.ed25519.generate()
    const claim = Voucher.claim.invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        identity: 'mailto:email@dag.house',
        product: 'product:free',
        service: service.did(),
      },
    })
    // @todo should not need to cast to string
    // this function only returns a string when ENV==='test' and that's weird
    const claimResult = await claim.execute(conn)

    assert.deepEqual(
      // @ts-expect-error for tests out comes as a string
      typeof claimResult.out.ok.encoded,
      'string',
      'claim result is a string'
    )
    const confirmEmailDelegation = await stringToDelegation(
      // @ts-expect-error for tests out comes as a string
      claimResult.out.ok.encoded
    ).delegate()
    const confirmEmailReceipt = await invoke({
      issuer,
      audience: service,
      capability: confirmEmailDelegation.capabilities[0],
      proofs: [confirmEmailDelegation],
    }).delegate()
    const [confirmEmailReceiptResult] = await conn.execute(
      /** @type {any} */ (confirmEmailReceipt)
    )
    assert.notDeepEqual(
      confirmEmailReceiptResult &&
        'error' in confirmEmailReceiptResult &&
        confirmEmailReceiptResult.error,
      true,
      'invocation result is not an error'
    )
  })
})
