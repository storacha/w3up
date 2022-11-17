/* eslint-disable unicorn/prefer-number-properties */
import * as Any from '@web3-storage/access/capabilities/any'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { context, test } from './helpers/context.js'
import { createAccount } from './helpers/utils.js'

test.before(async (t) => {
  t.context = await context()
})

test('should return account/redeem', async (t) => {
  const { issuer, service, conn, mf } = t.context

  const store = new StoreMemory()
  const account = await store.createAccount()
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: account.did(),
      nb: {
        identity: 'mailto:email@dag.house',
        product: service.did(),
      },
      proofs: [
        await Any.any.delegate({
          issuer: account,
          audience: issuer,
          with: account.did(),
          expiration: Infinity,
        }),
      ],
    })
    .execute(conn)

  if (!claim) {
    return t.fail('no output')
  }
  if (claim.error) {
    return t.fail(claim.message)
  }

  const delegation = await stringToDelegation(claim)

  const redeem = await Voucher.redeem
    .invoke({
      issuer,
      audience: service,
      with: service.did(),
      nb: {
        account: account.did(),
        identity: delegation.capabilities[0].nb.identity,
      },
      proofs: [
        delegation,
        await Any.any.delegate({
          issuer: account,
          audience: service,
          with: account.did(),
          expiration: Infinity,
        }),
      ],
    })

    .execute(conn)

  if (redeem?.error) {
    return t.fail()
  }

  const accounts = await mf.getKVNamespace('ACCOUNTS')

  const delEncoded = /** @type {string[]|undefined} */ (
    await accounts.get('mailto:email@dag.house', {
      type: 'json',
    })
  )
  if (!delEncoded) {
    return t.fail('no delegation for email')
  }

  const del = await stringToDelegation(
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').Any]>} */ (
      delEncoded[0]
    )
  )

  t.deepEqual(del.audience.did(), service.did())
  t.deepEqual(del.capabilities[0].can, '*')
  t.deepEqual(del.capabilities[0].with, account.did())
})

test('should save first account delegation', async (t) => {
  const { issuer, service, conn, mf } = t.context

  await createAccount(issuer, service, conn, 'first@dag.house')

  const accounts = await mf.getKVNamespace('ACCOUNTS')

  const delEncoded = await accounts.get('mailto:first@dag.house', {
    type: 'json',
  })

  // @ts-ignore
  t.assert(delEncoded.length === 1)
})

test('should save multiple account delegation', async (t) => {
  const { issuer, service, conn, mf } = t.context

  await createAccount(issuer, service, conn, 'multiple@dag.house')
  await createAccount(issuer, service, conn, 'multiple@dag.house')

  const accounts = await mf.getKVNamespace('ACCOUNTS')

  const delEncoded = await accounts.get('mailto:multiple@dag.house', {
    type: 'json',
  })

  // @ts-ignore
  t.assert(delEncoded.length === 2)
})
