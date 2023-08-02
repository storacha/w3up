import { Filecoin } from '@web3-storage/capabilities'
import * as Signer from '@ucanto/principal/ed25519'

import * as API from '../../src/types.js'

import { randomCargo } from '../utils.js'
import { createServer, connect } from '../../src/storefront.js'

/**
 * @type {API.Tests<API.StorefrontServiceContext & {
 *  addQueue: API.TestQueue<API.StorefrontQueueRecord>
 *  pieceStore: API.TestStore<API.StorefrontRecord>
 * }>}
 */
export const test = {
  'filecoin/add inserts piece into verification queue': async (
    assert,
    context
  ) => {
    const { agent } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate piece for test
    const [cargo] = await randomCargo(1, 128)

    // agent invocation
    const filecoinAddInv = Filecoin.filecoinAdd.invoke({
      issuer: agent,
      audience: connection.id,
      with: agent.did(),
      nb: {
        piece: cargo.link.link(),
        content: cargo.content.link(),
      },
    })

    const response = await filecoinAddInv.execute(connection)
    if (response.out.error) {
      throw new Error('invocation failed', { cause: response.out.error })
    }
    assert.ok(response.out.ok)
    assert.deepEqual(response.out.ok.status, 'queued')

    // Validate effect in receipt
    const fx = await Filecoin.filecoinAdd
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })
      .delegate()

    assert.ok(response.fx.join)
    assert.ok(fx.link().equals(response.fx.join?.link()))

    const queuedItems = context.addQueue.all()
    assert.equal(queuedItems.length, 1)
    assert.ok(
      queuedItems.find(
        (item) =>
          item.piece.equals(cargo.link.link()) &&
          item.content.equals(cargo.content.link())
      )
    )

    const storedItems = context.pieceStore.all()
    assert.equal(storedItems.length, 0)
  },
  'filecoin/add from signer inserts piece into store and returns accepted':
    async (assert, context) => {
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // storefront invocation
      const filecoinAddInv = Filecoin.filecoinAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })

      const response = await filecoinAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.deepEqual(response.out.ok.status, 'accepted')

      const queuedItems = context.addQueue.all()
      assert.equal(queuedItems.length, 0)

      const storedItems = context.pieceStore.all()
      assert.equal(storedItems.length, 1)
      assert.ok(
        storedItems.find(
          (item) =>
            item.piece.equals(cargo.link.link()) &&
            item.content.equals(cargo.content.link())
        )
      )
    },
  'skip filecoin/add from signer inserts piece into store and returns rejected':
    async (assert, context) => {
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate piece for test
      const [cargo] = await randomCargo(1, 128)

      // storefront invocation
      const filecoinAddInv = Filecoin.filecoinAdd.invoke({
        issuer: context.id,
        audience: connection.id,
        with: context.id.did(),
        nb: {
          piece: cargo.link.link(),
          content: cargo.content.link(),
        },
      })

      const response = await filecoinAddInv.execute(connection)
      if (response.out.error) {
        throw new Error('invocation failed', { cause: response.out.error })
      }
      assert.ok(response.out.ok)
      assert.deepEqual(response.out.ok.status, 'rejected')

      const queuedItems = context.addQueue.all()
      assert.equal(queuedItems.length, 0)

      const storedItems = context.pieceStore.all()
      assert.equal(storedItems.length, 0)
    },
}

async function getServiceContext() {
  const agent = await Signer.generate()

  return { agent }
}
