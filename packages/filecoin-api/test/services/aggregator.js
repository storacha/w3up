import { Filecoin } from '@web3-storage/capabilities'
import * as Signer from '@ucanto/principal/ed25519'
import pWaitFor from 'p-wait-for'

import * as API from '../../src/types.js'

import { randomCargo } from '../utils.js'
import { createServer, connect } from '../../src/aggregator.js'

/**
 * @type {API.Tests<API.AggregatorServiceContext>}
 */
export const test = {
  'piece/add inserts piece into processing queue': async (assert, context) => {
    const { storefront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    const group = 'did:web:free.web3.storage'

    // storefront invocation
    const pieceAddInv = Filecoin.aggregateAdd.invoke({
      issuer: storefront,
      audience: connection.id,
      with: storefront.did(),
      nb: {
        piece: cargo.link.link(),
        storefront: storefront.did(),
        group,
      },
    })

    const response = await pieceAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.ok(response.out.ok.piece.equals(cargo.link.link()))

    // Validate effect in receipt
    const fx = await Filecoin.aggregateAdd
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          piece: cargo.link.link(),
          storefront: storefront.did(),
          group,
        },
      })
      .delegate()

    assert.ok(response.fx.join)
    assert.ok(fx.link().equals(response.fx.join?.link()))

    // Validate queue and store
    await pWaitFor(() => context.queuedMessages.length === 1)

    const hasStoredPiece = await context.pieceStore.get({
      piece: cargo.link.link(),
      storefront: storefront.did(),
    })
    assert.ok(!hasStoredPiece.ok)
  },
  'piece/add from signer inserts piece into store and returns accepted': async (
    assert,
    context
  ) => {
    const { storefront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)
    const group = 'did:web:free.web3.storage'

    // aggregator invocation
    const pieceAddInv = Filecoin.aggregateAdd.invoke({
      issuer: context.id,
      audience: connection.id,
      with: context.id.did(),
      nb: {
        piece: cargo.link.link(),
        storefront: storefront.did(),
        group,
      },
    })

    const response = await pieceAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.ok(response.out.ok.piece.equals(cargo.link.link()))

    // Validate queue and store
    await pWaitFor(() => context.queuedMessages.length === 0)

    const hasStoredPiece = await context.pieceStore.get({
      piece: cargo.link.link(),
      storefront: storefront.did(),
    })
    assert.ok(hasStoredPiece.ok)
    assert.ok(hasStoredPiece.ok?.piece.equals(cargo.link.link()))
    assert.deepEqual(hasStoredPiece.ok?.group, group)
    assert.deepEqual(hasStoredPiece.ok?.storefront, storefront.did())
  },
  'skip piece/add from signer inserts piece into store and returns rejected':
    async (assert, context) => {
      const { storefront } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)
      const group = 'did:web:free.web3.storage'

      // aggregator invocation
      const pieceAddInv = Filecoin.aggregateAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          piece: cargo.link.link(),
          storefront: storefront.did(),
          group,
        },
      })

      const response = await pieceAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.ok(response.out.ok.piece.equals(cargo.link.link()))

      // Validate queue and store
      await pWaitFor(() => context.queuedMessages.length === 0)

      const hasStoredPiece = await context.pieceStore.get({
        piece: cargo.link.link(),
        storefront: storefront.did(),
      })
      assert.ok(!hasStoredPiece.ok)
    },
}

async function getServiceContext() {
  const storefront = await Signer.generate()

  return { storefront }
}
