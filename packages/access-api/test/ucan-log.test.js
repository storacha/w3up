/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/consistent-destructuring */
import * as Space from '@web3-storage/capabilities/space'
import assert from 'assert'
import { context } from './helpers/context.js'
import { codec as CAR } from '@ucanto/transport/car'
import { codec as CBOR } from '@ucanto/transport/cbor'
import { UCAN, isLink, invoke } from '@ucanto/core'
import * as API from '../src/bindings.js'

describe('ucan-log', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  /** @type {Uint8Array[]} */
  let invocations
  /** @type {API.ReceiptBlock[]} */
  let receipts
  beforeEach(async function () {
    invocations = []
    receipts = []
    ctx = await context({
      globals: {
        ucanlog: {
          invocations,
          receipts,
        },
      },
    })
  })

  it('receives invocation & receipt', async function () {
    const { issuer, service, conn } = ctx

    const task = await Space.info.invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      // otherwise delegation later will produce new timestamp
      expiration: UCAN.now() + 100,
    })

    const result = await task.execute(conn)

    const request = invocations.pop()
    assert.equal(
      request instanceof Uint8Array,
      true,
      'should have received a Uint8Array'
    )
    assert.deepEqual(invocations.length, 0, 'should not have other invocations')

    const car = CAR.decode(/** @type {Uint8Array} */ (request))
    const { cid } = await task.delegate()
    assert.deepEqual(
      car.roots.map((block) => block.cid),
      [cid],
      'CAR should have invocation cid as root'
    )

    const receipt = /** @type {API.ReceiptBlock} */ (receipts.pop())
    assert.equal(
      receipt?.bytes instanceof Uint8Array,
      true,
      'receipt should have bytes'
    )
    assert.equal(isLink(receipt.cid), true, 'receipt should have cid')
    assert.deepEqual(
      receipt.data.ran,
      cid,
      'receipt should point to invocation'
    )

    const error = /** @type {Error} */ (receipt.data.out.error)
    assert.deepEqual(error.name, 'SpaceUnknown')
    assert.deepEqual(error.message, 'Space not found.')

    const { s, ...payload } = receipt.data

    assert.deepEqual(
      // @ts-expect-error - Does not know that algorithm is compatible
      await ctx.service.signer.verify(CBOR.encode(payload), s),
      true,
      'receipt should be signed by service'
    )

    if (result?.error) {
      assert.equal(result.error, true, 'result should be an error')
      assert.deepEqual(result.message, `Space not found.`)
      const expectedErrorName = 'SpaceUnknown'
      assert.deepEqual(
        result.name,
        expectedErrorName,
        `error result has name ${expectedErrorName}`
      )
    } else {
      assert.fail()
    }
  })

  it('receives invocation batch & receipts', async function () {
    const { issuer, service, conn } = ctx

    const passTask = invoke({
      issuer,
      audience: service,
      capability: {
        with: issuer.did(),
        can: 'testing/pass',
      },
      expiration: UCAN.now() + 100,
    })

    const failTask = invoke({
      issuer,
      audience: service,
      capability: {
        with: issuer.did(),
        can: 'testing/fail',
      },
      expiration: UCAN.now() + 100,
    })

    const [passResult, failResult] = await conn.execute(passTask, failTask)

    const request = invocations.pop()
    assert.equal(
      request instanceof Uint8Array,
      true,
      'should have received a Uint8Array'
    )
    assert.deepEqual(invocations.length, 0, 'should not have other invocations')

    const car = CAR.decode(/** @type {Uint8Array} */ (request))
    const { cid: passCID } = await passTask.delegate()
    const { cid: failCID } = await failTask.delegate()
    assert.deepEqual(
      car.roots.map((block) => block.cid),
      [passCID, failCID],
      'CAR should have invocations as roots'
    )

    const passReceipt = /** @type {API.ReceiptBlock} */ (
      receipts.find(({ data }) => data.ran.toString() === passCID.toString())
    )

    const failReceipt = /** @type {API.ReceiptBlock} */ (
      receipts.find(({ data }) => data.ran.toString() === failCID.toString())
    )

    assert.equal(receipts.length, 2, 'should have received 2 receipts')

    assert.equal(passReceipt != null, true, 'receipt have pass receipt')
    assert.equal(
      passReceipt.data.out.ok,
      'test pass',
      'pass should have ok result'
    )

    assert.equal(failReceipt != null, true, 'receipt have fail receipt')
    assert.match(
      String(failReceipt.data.out.error),
      /test fail/,
      'fail receipt have error result'
    )

    for (const receipt of [passReceipt, failReceipt]) {
      const { s, ...payload } = receipt.data

      assert.deepEqual(
        // @ts-expect-error - Does not know that algorithm is compatible
        await ctx.service.signer.verify(CBOR.encode(payload), s),
        true,
        'receipt should be signed by service'
      )
    }

    assert.deepEqual(passResult, 'test pass', 'pass result should be ok')
    assert.deepEqual(failResult.error, true, 'fail result should be error')
    assert.match(
      failResult.message,
      /test fail/,
      'fail result should contain error'
    )
  })
})
