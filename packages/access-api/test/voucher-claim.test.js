import { Delegation } from '@ucanto/core'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context } from './helpers/context.js'
import assert from 'assert'

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
    if (inv.error) {
      return t.fail(inv.message)
    }

    const delegation = stringToDelegation(inv)

    t.deepEqual(delegation.issuer.did(), service.did())
    t.deepEqual(delegation.audience.did(), issuer.did())
    t.deepEqual(delegation.capabilities[0].nb.space, issuer.did())
    t.deepEqual(delegation.capabilities[0].nb.product, 'product:free')
    t.deepEqual(
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
