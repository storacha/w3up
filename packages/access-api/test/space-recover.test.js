import * as Space from '@web3-storage/capabilities/space'
import { stringToDelegation } from '@web3-storage/access/encoding'
import pWaitFor from 'p-wait-for'
import assert from 'assert'
import { context } from './helpers/context.js'
import { Validations } from '../src/models/validations.js'
import { createSpace } from './helpers/utils.js'

describe('space-recover', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })

  it('should fail before registering space', async function () {
    const { issuer, service, conn } = ctx

    const inv = await Space.recoverValidation
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          identity: 'mailto:hello@dag.house',
        },
      })
      .execute(conn)

    if (inv?.error) {
      assert.deepEqual(
        inv.message,
        `No spaces found for email: hello@dag.house.`
      )
    } else {
      assert.fail()
    }
  })

  it('should return space/recover', async function () {
    const { issuer, service, conn, mf } = ctx

    await createSpace(issuer, service, conn, 'space-recover@dag.house')

    const inv = await Space.recoverValidation
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          identity: 'mailto:space-recover@dag.house',
        },
      })
      .execute(conn)

    if (!inv || inv.error) {
      return assert.fail('failed to recover')
    }

    const url = new URL(inv)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} */ (
        url.searchParams.get('ucan')
      )

    const del = stringToDelegation(encoded)

    assert.deepEqual(del.audience.did(), issuer.did())
    assert.deepEqual(del.issuer.did(), service.did())
    assert.deepEqual(del.capabilities[0].can, 'space/recover')
    const rsp = await mf.dispatchFetch(url, { method: 'POST' })
    const html = await rsp.text()

    assert(html.includes(encoded))

    // @ts-ignore
    const validations = new Validations(await mf.getKVNamespace('VALIDATIONS'))
    const recoverEncoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} */ (
        await validations.get(issuer.did())
      )

    assert.ok(recoverEncoded)
    const recover = stringToDelegation(recoverEncoded)
    assert.deepEqual(recover.audience.did(), issuer.did())
    assert.deepEqual(recover.issuer.did(), service.did())
    assert.deepEqual(recover.capabilities[0].can, 'space/recover')

    // ws
    const res = await mf.dispatchFetch('http://localhost:8787/validate-ws', {
      headers: { Upgrade: 'websocket' },
    })

    const webSocket = res.webSocket
    if (webSocket) {
      let done = false
      webSocket.accept()
      webSocket.addEventListener('message', async (event) => {
        // @ts-ignore
        const data = JSON.parse(event.data)

        const encoded =
          /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} */ (
            data.delegation
          )

        assert.ok(encoded)
        const recover = stringToDelegation(encoded)
        assert.deepEqual(recover.audience.did(), issuer.did())
        assert.deepEqual(recover.issuer.did(), service.did())
        assert.deepEqual(recover.capabilities[0].can, 'space/recover')
        done = true
      })

      webSocket.send(
        JSON.stringify({
          did: issuer.did(),
        })
      )

      await pWaitFor(() => done)
    } else {
      assert.fail('should have ws')
    }
  })

  it('should invoke space/recover and get space delegation', async function () {
    const { issuer, service, conn } = ctx
    const email = 'space-recover@dag.house'
    const { space } = await createSpace(issuer, service, conn, email)

    const inv = await Space.recoverValidation
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
        nb: {
          // @ts-ignore
          identity: `mailto:${email}`,
        },
      })
      .execute(conn)

    if (!inv || inv.error) {
      return assert.fail('failed to recover')
    }

    const url = new URL(inv)
    const encoded =
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} */ (
        url.searchParams.get('ucan')
      )

    const del = stringToDelegation(encoded)

    assert.deepEqual(del.audience.did(), issuer.did())
    assert.deepEqual(del.issuer.did(), service.did())
    assert.deepEqual(del.capabilities[0].can, 'space/recover')

    const inv2 = await Space.recover
      .invoke({
        issuer,
        audience: service,
        with: service.did(),
        nb: {
          identity: del.capabilities[0].nb.identity,
        },
        proofs: [del],
      })
      .execute(conn)

    if (!inv2 || inv2.error) {
      return assert.fail('failed to recover')
    }

    const spaceDelegation = stringToDelegation(inv2[0])
    assert.deepEqual(spaceDelegation.audience.did(), issuer.did())
    assert.deepEqual(spaceDelegation.capabilities[0].can, '*')
    assert.deepEqual(spaceDelegation.capabilities[0].with, space.did())
    assert.deepEqual(spaceDelegation.facts[0], {
      agent: {
        description: 'testing',
        image: 'https://dag.house/logo.jpg',
        name: 'testing-agent',
        type: 'device',
        url: 'https://dag.house',
      },
      space: {
        name: 'name-' + email,
      },
    })

    const spaceInfo = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [spaceDelegation],
      })
      .execute(conn)

    if (!spaceInfo || spaceInfo.error) {
      return assert.fail('failed to get space info')
    }

    assert.deepEqual(spaceInfo.did, space.did())
  })
})
