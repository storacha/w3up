import * as Space from '@web3-storage/access/capabilities/space'
import { stringToDelegation } from '@web3-storage/access/encoding'
import pWaitFor from 'p-wait-for'
import { context, test } from './helpers/context.js'
import { Validations } from '../src/kvs/validations.js'

import { createSpace } from './helpers/utils.js'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('should fail before registering space', async (t) => {
  const { issuer, service, conn } = t.context

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
    t.deepEqual(inv.message, `No spaces found for email: hello@dag.house.`)
  } else {
    return t.fail()
  }
})

test('should return space/recover', async (t) => {
  const { issuer, service, conn, mf } = t.context

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
    return t.fail('failed to recover')
  }

  const url = new URL(inv)
  const encoded =
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').SpaceRecover]>} */ (
      url.searchParams.get('ucan')
    )

  const del = await stringToDelegation(encoded)

  t.deepEqual(del.audience.did(), issuer.did())
  t.deepEqual(del.issuer.did(), service.did())
  t.deepEqual(del.capabilities[0].can, 'space/recover')
  const rsp = await mf.dispatchFetch(url)
  const html = await rsp.text()

  t.assert(html.includes(encoded))

  const validations = new Validations(await mf.getKVNamespace('VALIDATIONS'))
  const recoverEncoded =
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').SpaceRecover]>} */ (
      await validations.get(issuer.did())
    )

  t.truthy(recoverEncoded)
  const recover = await stringToDelegation(recoverEncoded)
  t.deepEqual(recover.audience.did(), issuer.did())
  t.deepEqual(recover.issuer.did(), service.did())
  t.deepEqual(recover.capabilities[0].can, 'space/recover')

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
        /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').SpaceRecover]>} */ (
          data.delegation
        )

      t.truthy(encoded)
      const recover = await stringToDelegation(encoded)
      t.deepEqual(recover.audience.did(), issuer.did())
      t.deepEqual(recover.issuer.did(), service.did())
      t.deepEqual(recover.capabilities[0].can, 'space/recover')
      done = true
    })

    webSocket.send(
      JSON.stringify({
        did: issuer.did(),
      })
    )

    await pWaitFor(() => done)
  } else {
    t.fail('should have ws')
  }
})

test('should invoke space/recover and get space delegation', async (t) => {
  const { issuer, service, conn } = t.context
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
    return t.fail('failed to recover')
  }

  const url = new URL(inv)
  const encoded =
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').SpaceRecover]>} */ (
      url.searchParams.get('ucan')
    )

  const del = await stringToDelegation(encoded)

  t.deepEqual(del.audience.did(), issuer.did())
  t.deepEqual(del.issuer.did(), service.did())
  t.deepEqual(del.capabilities[0].can, 'space/recover')

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
    return t.fail('failed to recover')
  }

  const spaceDelegation = await stringToDelegation(inv2[0])
  t.deepEqual(spaceDelegation.audience.did(), issuer.did())
  t.deepEqual(spaceDelegation.capabilities[0].can, '*')
  t.deepEqual(spaceDelegation.capabilities[0].with, space.did())

  const spaceInfo = await Space.info
    .invoke({
      issuer,
      audience: service,
      with: space.did(),
      proofs: [spaceDelegation],
    })
    .execute(conn)

  if (!spaceInfo || spaceInfo.error) {
    return t.fail('failed to get space info')
  }

  t.deepEqual(spaceInfo.did, space.did())
})
