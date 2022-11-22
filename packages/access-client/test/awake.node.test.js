/* eslint-disable no-console */
import assert from 'assert'
import { Channel } from '../src/awake/channel.js'
import { EcdhKeypair } from '../src/crypto/p256-ecdh.js'
import { getWebsocketServer } from './helpers/miniflare.js'
import PQueue from 'p-queue'
import delay from 'delay'
import pWaitFor from 'p-wait-for'
import { Agent } from '../src/agent.js'
import { StoreMemory } from '../src/stores/store-memory.js'

describe('awake', function () {
  const host = new URL('ws://127.0.0.1:8788/connect')
  /** @type {import('http').Server} */
  let server

  /** @type {Channel} */
  let ws1
  /** @type {Channel} */
  let ws2

  this.beforeAll(async () => {
    server = await getWebsocketServer()
  })

  this.afterAll(() => {
    server.close()
  })

  this.beforeEach(async () => {
    ws1 = await new Channel(host, 'test', await EcdhKeypair.create()).open()
    ws2 = await new Channel(host, 'test', await EcdhKeypair.create()).open()
  })

  this.afterEach(async () => {
    await ws1.close()
    await ws2.close()
  })

  it('should send msgs', async function () {
    const agent1 = await Agent.create({
      store: await StoreMemory.create(),
      url: new URL('http://127.0.0.1:8787'),
    })
    const space = await agent1.createSpace('responder')
    await agent1.setCurrentSpace(space.did)
    const agent2 = await Agent.create({
      store: await StoreMemory.create(),
      url: new URL('http://127.0.0.1:8787'),
    })
    const responder = agent1.peer(ws1)
    const requestor = agent2.peer(ws2)

    const queue = new PQueue({ concurrency: 2 })
    queue.on('error', (error) => {
      console.error(error)
    })

    /**
     * @type {string | undefined}
     */
    let pin
    /**
     * @type {{delegation: import('@ucanto/interface').Delegation, meta: import('../src/awake/types.js').PeerMeta}}
     */
    let link
    queue.add(async () => responder.awaitBootstrap(), { priority: 0 })
    queue.add(() => delay(300), { priority: 1 })
    await queue.add(
      async () => {
        pin = await requestor.bootstrap([
          { with: responder.did, can: 'identity/*' },
        ])
        console.log(pin)
      },
      { priority: 2 }
    )
    assert.ok(pin)
    queue.add(async () => {
      await requestor.awaitAck()
    })

    // wait ack
    await queue.add(async () => {
      // @ts-ignore
      await responder.ack(pin)
    })

    queue.add(async () => {
      await responder.awaitLink()
    })

    queue.add(async () => {
      link = await requestor.link({
        caps: [{ can: 'identity/*' }],
        meta: {
          name: requestor.did,
          type: 'device',
        },
      })
    })

    await queue.onIdle()
    // @ts-ignore
    if (link) {
      assert.deepEqual(requestor.did, link.delegation.audience.did())
      assert.deepEqual(space.did, link.delegation.capabilities[0].with)
      assert.deepEqual('*', link.delegation.capabilities[0].can)
    }

    // they should close channel after link
    await pWaitFor(() => responder.channel.ws?.readyState === 3)
    await pWaitFor(() => responder.channel.ws?.readyState === 3)
  })
})
