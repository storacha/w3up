/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/consistent-destructuring */
import * as Space from '@web3-storage/capabilities/space'
import assert from 'assert'
import { context } from './helpers/context.js'
import { UCAN, isLink, invoke } from '@ucanto/core'

describe('ucan-log', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  /** @type {import('@ucanto/interface').Invocation[]} */
  let invocations
  /** @type {import('@ucanto/interface').Receipt[]} */
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
    await task.execute(conn)

    const invocation = invocations.pop()
    assert.ok(invocation, 'should have received invocation')

    const { cid } = await task.delegate()
    assert.deepEqual(invocation.cid, cid, 'invocation should have same CID')

    const receipt = receipts.pop()
    assert.ok(receipt)
    assert.equal(isLink(receipt.ran.link()), true, 'receipt should have cid')
    assert.deepEqual(
      receipt.ran.link(),
      cid,
      'receipt should point to invocation'
    )

    const error = /** @type {Error} */ (receipt.out.error)
    assert.ok(error)
    assert.deepEqual(error.name, 'SpaceUnknown')
    assert.deepEqual(error.message, 'Space not found.')

    assert.deepEqual(
      await receipt.verifySignature(ctx.service.signer),
      { ok: {} },
      'receipt should be signed by service'
    )
  })

  it('receives invocation batch & receipts', async function () {
    const { issuer, service, conn } = ctx

    const passTask = invoke({
      issuer,
      audience: service,
      capability: {
        with: issuer.did(),
        can: 'console/log',
        nb: { value: 'pass' },
      },
      expiration: UCAN.now() + 100,
    })

    const failTask = invoke({
      issuer,
      audience: service,
      capability: {
        with: issuer.did(),
        can: 'console/error',
        nb: { error: 'Boom!' },
      },
      expiration: UCAN.now() + 100,
    })

    const [passResult, failResult] = await conn.execute(passTask, failTask)

    const invocationB = invocations.pop()
    assert.ok(invocationB, 'should have received second invocation')
    const invocationA = invocations.pop()
    assert.ok(invocationA, 'should have received first invocation')

    const { cid: passCID } = await passTask.delegate()
    const { cid: failCID } = await failTask.delegate()

    assert.deepEqual(invocationA.cid, passCID)
    assert.deepEqual(invocationB.cid, failCID)

    assert.equal(receipts.length, 2, 'should have received 2 receipts')
    const passReceipt = receipts.find(
      ({ ran }) => ran.link().toString() === passCID.toString()
    )

    const failReceipt = receipts.find(
      ({ ran }) => ran.link().toString() === failCID.toString()
    )

    assert.ok(passReceipt, 'receipt have pass receipt')
    assert.deepEqual(
      passReceipt.out,
      { ok: 'pass' },
      'pass should have ok result'
    )

    assert.ok(failReceipt, 'receipt have fail receipt')
    assert.match(
      failReceipt.out.error.cause,
      /Boom!/,
      'fail receipt have error result'
    )

    for (const receipt of [passReceipt, failReceipt]) {
      assert.deepEqual(
        await receipt.verifySignature(ctx.service.signer),
        { ok: {} },
        'receipt should be signed by service'
      )
    }

    assert.deepEqual(passResult.out, { ok: 'pass' }, 'pass result should be ok')
    assert.ok(failResult.out.error, 'fail result should be error')
    assert.match(
      JSON.stringify(failResult.out.error),
      /Boom!/,
      'fail result should contain error'
    )
  })
})
