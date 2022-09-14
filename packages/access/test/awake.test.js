/* eslint-disable no-console */
import assert from 'assert'
import { Channel } from '../src/awake/channel.js'
import { EcdhKeypair } from '../src/crypto/p256-ecdh.js'
import { getWebsocketServer } from './helpers/miniflare.js'
import * as Keypair from '@ucanto/authority'
import { Responder } from '../src/awake/responder.js'
import { Requestor } from '../src/awake/requestor.js'
import PQueue from 'p-queue'
import delay from 'delay'

describe('awake', function () {
  const host = new URL('ws://127.0.0.1:8788/connect')
  /** @type {import('http').Server} */
  let server

  this.beforeAll(async () => {
    server = await getWebsocketServer()
  })

  this.afterAll(() => {
    server.close()
  })

  it('should send msgs', async function () {
    const ws1 = new Channel(host, 'test', await EcdhKeypair.create())
    const ws2 = new Channel(host, 'test', await EcdhKeypair.create())
    const kp1 = await Keypair.SigningAuthority.generate()
    const kp2 = await Keypair.SigningAuthority.generate()
    const responder = new Responder({ agent: kp1, channel: ws1 })
    const requestor = await Requestor.create(kp2, ws2)

    const queue = new PQueue({ concurrency: 2 })
    queue.on('error', (error) => {
      console.error(error.message)
    })

    /**
     * @type {string | undefined}
     */
    let pin
    let delegation
    queue.add(async () => responder.bootstrap(), { priority: 0 })
    queue.add(() => delay(300), { priority: 1 })
    await queue.add(
      async () => {
        pin = await requestor.bootstrap([
          { with: responder.did, can: 'identity/*' },
        ])
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
      delegation = await requestor.link()
    })

    await queue.onIdle()
    console.log('🚀 ~ file: awake.test.js ~ line 49 ~ pin', delegation)

    ws1.close()
    ws2.close()
  })
})
