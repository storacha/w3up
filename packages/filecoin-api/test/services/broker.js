import { Filecoin } from '@web3-storage/capabilities'
import * as Signer from '@ucanto/principal/ed25519'
import { CBOR } from '@ucanto/core'

import * as API from '../../src/types.js'

import { randomAggregate } from '../utils.js'
import { createServer, connect } from '../../src/broker.js'

/**
 * @type {API.Tests<API.BrokerServiceContext>}
 */
export const test = {
  'aggregate/add inserts piece into processing queue': async (
    assert,
    context
  ) => {
    const { aggregator } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const offer = pieces.map((p) => p.link)
    const offerBlock = await CBOR.write(offer)
    const dealConfig = {
      tenantId: 'web3.storage',
    }

    // aggregator invocation
    const pieceAddInv = Filecoin.aggregateAdd.invoke({
      issuer: aggregator,
      audience: connection.id,
      with: aggregator.did(),
      nb: {
        piece: aggregate.link,
        offer: offerBlock.cid,
        deal: dealConfig,
      },
    })
    pieceAddInv.attach(offerBlock)

    const response = await pieceAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.deepEqual(response.out.ok.status, 'queued')

    // Validate effect in receipt
    const fx = await Filecoin.aggregateAdd
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          piece: aggregate.link,
          offer: offerBlock.cid,
          deal: dealConfig,
        },
      })
      .delegate()

    assert.ok(response.fx.join)
    assert.ok(fx.link().equals(response.fx.join?.link()))

    // Validate queue and store
    assert.ok(context.queuedMessages.length === 1)

    const hasStoredOffer = await context.offerStore.get({
      piece: aggregate.link.link(),
    })
    assert.ok(!hasStoredOffer.ok)
  },
  'aggregate/add from signer inserts piece into store and returns accepted':
    async (assert, context) => {
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const offerBlock = await CBOR.write(offer)
      const dealConfig = {
        tenantId: 'web3.storage',
      }

      // aggregator invocation
      const pieceAddInv = Filecoin.aggregateAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          piece: aggregate.link,
          offer: offerBlock.cid,
          deal: dealConfig,
        },
      })
      pieceAddInv.attach(offerBlock)

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.deepEqual(response.out.ok.status, 'accepted')

      // Validate queue and store
      assert.ok(context.queuedMessages.length === 0)

      const hasStoredOffer = await context.offerStore.get({
        piece: aggregate.link.link(),
      })
      assert.ok(hasStoredOffer.ok)
    },
  'skip aggregate/add from signer inserts piece into store and returns rejected':
    async (assert, context) => {
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const offerBlock = await CBOR.write(offer)
      const dealConfig = {
        tenantId: 'web3.storage',
      }

      // aggregator invocation
      const pieceAddInv = Filecoin.aggregateAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          piece: aggregate.link,
          offer: offerBlock.cid,
          deal: dealConfig,
        },
      })
      pieceAddInv.attach(offerBlock)

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.deepEqual(response.out.ok.status, 'rejected')

      // Validate queue and store
      assert.ok(context.queuedMessages.length === 0)

      const hasStoredOffer = await context.offerStore.get({
        piece: aggregate.link.link(),
      })
      assert.ok(!hasStoredOffer.ok)
    },
}

async function getServiceContext() {
  const aggregator = await Signer.generate()

  return { aggregator }
}
