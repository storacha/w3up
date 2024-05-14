import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'
import { randomAggregate, randomCAR, randomCargo } from '../helpers/random.js'
import { Receipt, Message } from '@ucanto/core'
import * as Test from '../test.js'

export const FilecoinClient = Test.withContext({
  offer: {
    'should send an offer': async (assert, { client: alice }) => {
      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const [cargo] = await randomCargo(1, 100)
      const res = await alice.capability.filecoin.offer(
        cargo.content,
        cargo.link
      )

      assert.ok(res.out.ok)
      assert.equal(res.out.ok?.piece.toString(), cargo.link.toString())
      assert.ok(res.fx.join)
      assert.ok(res.fx.fork.length > 0)
    },
  },
  info: {
    'should get piece info': async (
      assert,
      { client: alice, pieceStore, service, agentStore }
    ) => {
      const { pieces, aggregate } = await randomAggregate(10, 100)
      const content = await randomCAR(100)
      const cargo = pieces[0]
      // compute proof for piece in aggregate
      const proof = aggregate.resolveProof(cargo.link)
      if (proof.error) {
        throw new Error('could not compute proof')
      }

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await pieceStore.put({
        piece: cargo.link,
        content: content.cid,
        group: 'some-group',
        status: 'accepted',
        insertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const pieceAcceptInvocation = await FilecoinCapabilities.accept
        .invoke({
          issuer: service.signer,
          audience: service.signer,
          with: service.signer.did(),
          nb: {
            piece: cargo.link,
            content: content.cid,
          },
          expiration: Infinity,
        })
        .delegate()

      // @ts-ignore
      await agentStore.messages.write(
        await Message.build({
          receipts: [
            await Receipt.issue({
              issuer: service.signer,
              ran: pieceAcceptInvocation.link(),
              result: {
                ok: {
                  piece: cargo.link,
                  aggregate: aggregate.link,
                  inclusion: {
                    subtree: proof.ok[0],
                    index: proof.ok[1],
                  },
                },
              },
            }),
          ],
        })
      )

      const res = await alice.capability.filecoin.info(cargo.link)
      assert.deepEqual(res.out.ok?.piece.toString(), cargo.link.toString())
      assert.deepEqual(
        res.out.ok?.aggregates[0].aggregate.toString(),
        aggregate.link.toString()
      )
      assert.ok(res.out.ok?.deals.length ?? 0 > 0)
      assert.ok(res.out.ok?.deals[0].aggregate.equals(aggregate.link))
      assert.ok(res.out.ok?.deals[0].aux.dataSource.dealID)
      assert.ok(res.out.ok?.deals[0].provider)
      assert.deepEqual(res.out.ok?.aggregates[0].inclusion, {
        subtree: proof.ok[0],
        index: proof.ok[1],
      })
    },
  },
})

Test.test({ FilecoinClient })
