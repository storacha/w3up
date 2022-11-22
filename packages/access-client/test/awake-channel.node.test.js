import assert from 'assert'
import { Channel } from '../src/awake/channel.js'
import { EcdhKeypair } from '../src/crypto/p256-ecdh.js'
import { getWebsocketServer } from './helpers/miniflare.js'
import pWaitFor from 'p-wait-for'
import * as UCAN from '@ipld/dag-ucan'
import * as DID from '@ipld/dag-ucan/did'
import { Signer } from '@ucanto/principal/ed25519'

describe('awake channel', function () {
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

  it('should fail send with ws not open', async function () {
    await ws1.close()

    try {
      ws1.send({
        type: 'awake/init',
      })
      assert.fail('should not send msg ws is closed')
    } catch (error) {
      // @ts-ignore
      assert.deepEqual(error.message, 'Websocket is not active.')
    }
  })

  describe('pubsub', function () {
    it('should send msg receive with sub', async function () {
      let done = false
      ws2.subscribe('awake/init', (data) => {
        assert.deepEqual(data, { type: 'awake/init' })
        done = true
      })
      ws1.send({
        type: 'awake/init',
      })

      await pWaitFor(() => done)
    })

    it('should send two msgs receive with sub', async function () {
      let done = 0
      ws2.subscribe('awake/init', (data) => {
        done++
      })
      ws1.send({
        type: 'awake/init',
      })
      ws1.send({
        type: 'awake/init',
      })

      await pWaitFor(() => done === 2)
    })

    it('should send two msgs receive once with sub', async function () {
      let done = 0
      let once = 0
      ws2.subscribe(
        'awake/init',
        () => {
          once++
        },
        true
      )
      ws2.subscribe('awake/init', () => {
        done++
      })
      ws1.send({
        type: 'awake/init',
      })
      ws1.send({
        type: 'awake/init',
      })

      await pWaitFor(() => done === 2)
      assert.equal(once, 1)
    })
  })

  describe('awake/res', function () {
    it('should send awake/res', async function () {
      const ucan = await UCAN.issue({
        issuer: await Signer.generate(),
        audience: DID.parse(ws2.keypair.did),
        capabilities: [{ with: 'awake:', can: '*' }],
      })
      const did1 = DID.parse(ws1.keypair.did)
      const did2 = DID.parse(ws2.keypair.did)
      await ws1.sendRes(did2, ucan)
      const msg = await ws2.awaitRes()

      assert.deepEqual(msg.aud, did2)
      assert.deepEqual(msg.iss, did1)
    })

    it('should fail with wrong aud awake/res', async function () {
      const ucan = await UCAN.issue({
        issuer: await Signer.generate(),
        audience: DID.parse(ws2.keypair.did),
        capabilities: [{ with: 'awake:', can: '*' }],
      })
      const did1 = DID.parse(ws1.keypair.did)
      // const did2 = DID.parse(ws2.keypair.did)
      await ws1.sendRes(did1, ucan)

      return assert.rejects(ws2.awaitRes())
    })
  })

  describe('awake/init', function () {
    it('should send init', async function () {
      await ws1.sendInit([{ can: '*', with: 'did:' }])

      const msg = await ws2.awaitInit()
      assert.deepEqual(msg.type, 'awake/init')
    })

    it('should send awake/init', async function () {
      ws1.sendInit([{ with: 'did:key:zdd', can: '*' }])

      const msg = await ws2.awaitInit()
      assert.deepEqual(msg, {
        awv: '0.1.0',
        type: 'awake/init',
        did: DID.parse(ws1.keypair.did),
        caps: [{ with: 'did:key:zdd', can: '*' }],
      })
    })

    it('should fail to parse awake/init', async function () {
      // @ts-expect-error
      ws1.sendInit([{ with: 'did:key:zdd', WRONG: '*' }])

      return assert.rejects(ws2.awaitInit(), (err) => {
        const msg = JSON.parse(/** @type {Error} */ (err).message)
        assert.deepEqual(msg, [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['caps', 0, 'can'],
            received: 'undefined',
          },
        ])
        return true
      })
    })
  })
})
