import { Filecoin } from '@web3-storage/capabilities'
import * as Signer from '@ucanto/principal/ed25519'
import pWaitFor from 'p-wait-for'
import { CBOR } from '@ucanto/core'

import * as API from '../../src/types.js'

import { randomAggregate } from '../utils.js'
import { createServer, connect } from '../../src/dealer.js'

/**
 * @type {API.Tests<API.DealerServiceContext>}
 */
export const test = {
  'aggregate/queue inserts piece into processing queue': async (
    assert,
    context
  ) => {
    const { aggregator, storefront: storefrontSigner } =
      await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    const storefront = storefrontSigner.did()
    const label = 'label'

    // aggregator invocation
    const pieceAddInv = Filecoin.dealQueue.invoke({
      issuer: aggregator,
      audience: connection.id,
      with: aggregator.did(),
      nb: {
        aggregate: aggregate.link,
        pieces: piecesBlock.cid,
        storefront,
        label,
      },
    })
    pieceAddInv.attach(piecesBlock)

    const response = await pieceAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.ok(response.out.ok.aggregate?.equals(aggregate.link))

    // Validate effect in receipt
    const fx = await Filecoin.dealAdd
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          storefront,
          label,
        },
      })
      .delegate()

    assert.ok(response.fx.join)
    assert.ok(fx.link().equals(response.fx.join?.link()))

    // Validate queue and store
    await pWaitFor(() => context.queuedMessages.length === 1)

    const hasStoredOffer = await context.offerStore.get({
      piece: aggregate.link.link(),
    })
    assert.ok(!hasStoredOffer.ok)
  },
  'aggregate/add from signer inserts piece into store and returns accepted':
    async (assert, context) => {
      const { storefront: storefrontSigner } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const piecesBlock = await CBOR.write(offer)
      const storefront = storefrontSigner.did()
      const label = 'label'

      // aggregator invocation
      const pieceAddInv = Filecoin.dealAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          storefront,
          label,
        },
      })
      pieceAddInv.attach(piecesBlock)

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.aggregate?.equals(aggregate.link))

      // Validate queue and store
      await pWaitFor(() => context.queuedMessages.length === 0)

      const hasStoredOffer = await context.offerStore.get(aggregate.link.link())
      assert.ok(hasStoredOffer.ok)
    },
  'skip aggregate/add from signer inserts piece into store and returns rejected':
    async (assert, context) => {
      const { storefront: storefrontSigner } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const offer = pieces.map((p) => p.link)
      const piecesBlock = await CBOR.write(offer)
      const storefront = storefrontSigner.did()
      const label = 'label'

      // aggregator invocation
      const pieceAddInv = Filecoin.dealAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          aggregate: aggregate.link,
          pieces: piecesBlock.cid,
          storefront,
          label,
        },
      })
      pieceAddInv.attach(piecesBlock)

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.deepEqual(response.out.ok.aggregate, aggregate.link)

      // Validate queue and store
      await pWaitFor(() => context.queuedMessages.length === 0)

      const hasStoredOffer = await context.offerStore.get({
        aggregate: aggregate.link.link(),
      })
      assert.ok(!hasStoredOffer.ok)
    },
}

async function getServiceContext() {
  const aggregator = await Signer.generate()
  const storefront = await Signer.generate()

  return { aggregator, storefront }
}
