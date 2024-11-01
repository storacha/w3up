import { DealTracker } from '@storacha/capabilities'
import * as Signer from '@ucanto/principal/ed25519'

import * as API from '../../src/types.js'
import * as DealTrackerApi from '../../src/deal-tracker/api.js'

import { createServer, connect } from '../../src/deal-tracker/service.js'
import { randomCargo } from '../utils.js'
import { FailingStore } from '../context/store.js'
import { StoreOperationErrorName } from '../../src/errors.js'

/**
 * @typedef {import('../../src/deal-tracker/api.js').DealRecord} DealRecord
 * @typedef {import('../../src/deal-tracker/api.js').DealRecordKey} DealRecordKey
 */

/**
 * @type {API.Tests<DealTrackerApi.ServiceContext>}
 */
export const test = {
  'deal/info fails to get info for non existent piece CID': async (
    assert,
    context
  ) => {
    const { dealer } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // dealer invocation
    const dealInfoInv = DealTracker.dealInfo.invoke({
      issuer: dealer,
      audience: connection.id,
      with: dealer.did(),
      nb: {
        piece: cargo.link.link(),
      },
    })

    const response = await dealInfoInv.execute(connection)
    assert.ok(response.out)
    assert.deepEqual(response.out.ok?.deals, {})
  },
  'deal/info retrieves available deals for aggregate piece CID': async (
    assert,
    context
  ) => {
    const { dealer } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    const dealIds = [111, 222]
    await Promise.all(
      dealIds.map(async (dealId) => {
        const dealPutRes = await context.dealStore.put({
          piece: cargo.link,
          dealId,
          provider: `f0${dealId}`,
          expirationEpoch: Date.now() + 10e9,
          source: 'cargo.dag.haus',
          insertedAt: new Date().toISOString(),
        })

        assert.ok(dealPutRes.ok)
      })
    )

    // dealer invocation
    const dealInfoInv = DealTracker.dealInfo.invoke({
      issuer: dealer,
      audience: connection.id,
      with: dealer.did(),
      nb: {
        piece: cargo.link.link(),
      },
    })

    const response = await dealInfoInv.execute(connection)
    assert.ok(response.out.ok)
    for (const dealId of dealIds) {
      assert.ok(response.out.ok?.deals[`${dealId}`])
      assert.equal(response.out.ok?.deals[`${dealId}`].provider, `f0${dealId}`)
    }
  },
  'deal/info fails if not able to query deal store': wichMockableContext(
    async (assert, context) => {
      const { dealer } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // dealer invocation
      const dealInfoInv = DealTracker.dealInfo.invoke({
        issuer: dealer,
        audience: connection.id,
        with: dealer.did(),
        nb: {
          piece: cargo.link.link(),
        },
      })

      const response = await dealInfoInv.execute(connection)
      assert.ok(response.out.error)
      assert.equal(response.out.error?.name, StoreOperationErrorName)
    },
    (context) => ({
      ...context,
      dealStore: new FailingStore(),
    })
  ),
}

async function getServiceContext() {
  const dealer = await Signer.generate()

  return { dealer }
}

/**
 * @param {API.Test<DealTrackerApi.ServiceContext>} testFn
 * @param {(context: DealTrackerApi.ServiceContext) => DealTrackerApi.ServiceContext} mockContextFunction
 */
function wichMockableContext(testFn, mockContextFunction) {
  // @ts-ignore
  return function (...args) {
    const modifiedArgs = [args[0], mockContextFunction(args[1])]
    // @ts-ignore
    return testFn(...modifiedArgs)
  }
}
