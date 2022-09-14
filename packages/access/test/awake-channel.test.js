import assert from 'assert'
import { Channel } from '../src/awake/channel.js'
import { EcdhKeypair } from '../src/crypto/p256-ecdh.js'
import { getWebsocketServer } from './helpers/miniflare.js'

describe('awake channel', function () {
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

    await ws1.send({
      type: 'awake/init',
    })

    const msg = await ws2.awaitMessage('awake/init')
    assert.deepEqual(msg, { type: 'awake/init' })

    ws1.close()
    ws2.close()
  })

  it('should fail send with ws not open', async function () {
    const ws1 = new Channel(host, 'test', await EcdhKeypair.create())

    ws1.close()

    try {
      await ws1.send({
        type: 'awake/init',
      })
      assert.fail('should not send msg ws is closed')
    } catch (error) {
      // @ts-ignore
      assert.deepEqual(error.message, 'Websocket is not active.')
    }
  })

  it('should send awake/init', async function () {
    const ws1 = new Channel(host, 'test', await EcdhKeypair.create())
    const ws2 = new Channel(host, 'test', await EcdhKeypair.create())

    ws1.awakeInit('did:key:zdd', [{ with: 'did:key:zdd', can: '*' }])

    const msg = await ws2.awaitMessage('awake/init')
    assert.deepEqual(msg, {
      awv: '0.1.0',
      type: 'awake/init',
      did: 'did:key:zdd',
      caps: [{ with: 'did:key:zdd', can: '*' }],
    })

    ws1.close()
    ws2.close()
  })

  it('should send awake/res', async function () {
    const ws1 = new Channel(host, 'test', await EcdhKeypair.create())
    const ws2 = new Channel(host, 'test', await EcdhKeypair.create())

    ws1.awakeRes('did:key:zdd', 'did:key:zdd', 'ucan')

    const msg = await ws2.awaitMessage('awake/res')
    assert.deepEqual(msg, {
      awv: '0.1.0',
      type: 'awake/res',
      aud: 'did:key:zdd',
      iss: 'did:key:zdd',
      msg: 'ucan',
    })

    ws1.close()
    ws2.close()
  })
})
