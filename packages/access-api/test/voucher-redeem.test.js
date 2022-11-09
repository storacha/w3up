/* eslint-disable unicorn/prefer-number-properties */
import * as Any from '@web3-storage/access/capabilities/any'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import { context, test } from './helpers/context.js'
import { createAccount } from './helpers/utils.js'
import { Accounts } from '../src/kvs/accounts.js'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('should return account/redeem', async (t) => {
  const { issuer, service, conn, mf, db } = t.context

  const store = new StoreMemory()
  const account = await store.createAccount()
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: account.did(),
      nb: {
        identity: 'mailto:email@dag.house',
        product: 'product:free',
        service: service.did(),
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
        product: delegation.capabilities[0].nb.product,
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

  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'), db)

  // check db for account
  t.like(await accounts.get(account.did()), {
    did: account.did(),
    product: 'product:free',
    email: 'email@dag.house',
    agent: issuer.did(),
  })

  // check account delegations
  const delegations = await accounts.getDelegations('mailto:email@dag.house')

  if (!delegations) {
    return t.fail('no delegation for email')
  }

  const del = await stringToDelegation(delegations[0])

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

test('should fail with wrong resource', async (t) => {
  const { issuer, service, conn } = t.context

  const redeem = await Voucher.redeem
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        account: issuer.did(),
        identity: 'mailto:email@dag.house',
        product: 'product:free',
      },
    })
    .execute(conn)

  if (redeem.error) {
    t.true(redeem.error)
    t.deepEqual(
      redeem.message,
      `Resource ${issuer.did()} does not service did ${service.did()}`
    )
  } else {
    t.fail('should fail')
  }
})
