import * as CAR from '@ucanto/transport/car'
import { Store, Usage } from '@storacha/capabilities'
import * as API from '../../src/types.js'
import { createServer, connect } from '../../src/lib.js'
import { alice, registerSpace } from '../util.js'

/** @type {API.Tests} */
export const test = {
  'usage/report retrieves usage data': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)
    const size = data.byteLength

    const storeAddRes = await Store.add
      .invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: { link, size },
        proofs: [proof],
      })
      .execute(connection)

    assert.ok(storeAddRes.out.ok)

    const usageReportRes = await Usage.report
      .invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: { period: { from: 0, to: Math.ceil(Date.now() / 1000) + 1 } },
        proofs: [proof],
      })
      .execute(connection)

    const provider =
      /** @type {import('../types.js').ProviderDID} */
      (context.id.did())
    const report = usageReportRes.out.ok?.[provider]
    assert.equal(report?.space, spaceDid)
    assert.equal(report?.size.initial, 0)
    assert.equal(report?.size.final, size)
    assert.equal(report?.events.length, 1)
    assert.equal(report?.events[0].delta, size)
    assert.equal(
      report?.events[0].cause.toString(),
      storeAddRes.ran.link().toString()
    )
  },
}
