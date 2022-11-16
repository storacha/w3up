import * as Account from '@web3-storage/access/capabilities/account'
import { stringToDelegation } from '@web3-storage/access/encoding'
import pWaitFor from 'p-wait-for'
import { context, test } from './helpers/context.js'
import { Validations } from '../src/kvs/validations.js'

import { createAccount } from './helpers/utils.js'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('should fail before registering account', async (t) => {
  const { issuer, service, conn } = t.context

  const inv = await Account.recoverValidation
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
    t.deepEqual(inv.message, `No accounts found for email: hello@dag.house.`)
  } else {
    return t.fail()
  }
})

test('should return account/recover', async (t) => {
  const { issuer, service, conn, mf } = t.context

  await createAccount(issuer, service, conn, 'account-recover@dag.house')

  const inv = await Account.recoverValidation
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        identity: 'mailto:account-recover@dag.house',
      },
    })
    .execute(conn)

  if (!inv || inv.error) {
    return t.fail('failed to recover')
  }

  const url = new URL(inv)
  const encoded =
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').AccountRecover]>} */ (
      url.searchParams.get('ucan')
    )

  const del = await stringToDelegation(encoded)

  t.deepEqual(del.audience.did(), issuer.did())
  t.deepEqual(del.issuer.did(), service.did())
  t.deepEqual(del.capabilities[0].can, 'account/recover')
  const rsp = await mf.dispatchFetch(url)
  const html = await rsp.text()

  t.assert(html.includes(encoded))

  const validations = new Validations(await mf.getKVNamespace('VALIDATIONS'))
  const recoverEncoded =
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').AccountRecover]>} */ (
      await validations.get(issuer.did())
    )

  t.truthy(recoverEncoded)
  const recover = await stringToDelegation(recoverEncoded)
  t.deepEqual(recover.audience.did(), issuer.did())
  t.deepEqual(recover.issuer.did(), service.did())
  t.deepEqual(recover.capabilities[0].can, 'account/recover')

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
        /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').AccountRecover]>} */ (
          data.delegation
        )

      t.truthy(encoded)
      const recover = await stringToDelegation(encoded)
      t.deepEqual(recover.audience.did(), issuer.did())
      t.deepEqual(recover.issuer.did(), service.did())
      t.deepEqual(recover.capabilities[0].can, 'account/recover')
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

test('should invoke account/recover and get account delegation', async (t) => {
  const { issuer, service, conn } = t.context
  const email = 'account-recover@dag.house'
  const { account } = await createAccount(issuer, service, conn, email)

  const inv = await Account.recoverValidation
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
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').AccountRecover]>} */ (
      url.searchParams.get('ucan')
    )

  const del = await stringToDelegation(encoded)

  t.deepEqual(del.audience.did(), issuer.did())
  t.deepEqual(del.issuer.did(), service.did())
  t.deepEqual(del.capabilities[0].can, 'account/recover')

  const inv2 = await Account.recover
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

  const accountDelegation = await stringToDelegation(inv2[0])
  t.deepEqual(accountDelegation.audience.did(), issuer.did())
  t.deepEqual(accountDelegation.capabilities[0].can, '*')
  t.deepEqual(accountDelegation.capabilities[0].with, account.did())

  const accountInfo = await Account.info
    .invoke({
      issuer,
      audience: service,
      with: account.did(),
      proofs: [accountDelegation],
    })
    .execute(conn)

  if (!accountInfo || accountInfo.error) {
    return t.fail('failed to get account info')
  }

  t.deepEqual(accountInfo.did, account.did())
})
