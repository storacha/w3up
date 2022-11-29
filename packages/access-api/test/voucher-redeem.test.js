/* eslint-disable unicorn/prefer-number-properties */
import * as Top from '@web3-storage/capabilities/top'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context, test } from './helpers/context.js'
import { createSpace } from './helpers/utils.js'
import { Spaces } from '../src/kvs/spaces.js'
import { Signer } from '@ucanto/principal/ed25519'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('should return voucher/redeem', async (t) => {
  const { issuer, service, conn, mf, db } = t.context

  const space = await Signer.generate()
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: space.did(),
      nb: {
        identity: 'mailto:email@dag.house',
        product: 'product:free',
        service: service.did(),
      },
      proofs: [
        await Top.top.delegate({
          issuer: space,
          audience: issuer,
          with: space.did(),
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
        space: space.did(),
        identity: delegation.capabilities[0].nb.identity,
        product: delegation.capabilities[0].nb.product,
      },
      proofs: [
        delegation,
        await Top.top.delegate({
          issuer: space,
          audience: service,
          with: space.did(),
          expiration: Infinity,
        }),
      ],
    })

    .execute(conn)

  if (redeem?.error) {
    return t.fail()
  }

  const spaces = new Spaces(await mf.getKVNamespace('SPACES'), db)

  // check db for space
  t.like(await spaces.get(space.did()), {
    did: space.did(),
    product: 'product:free',
    email: 'email@dag.house',
    agent: issuer.did(),
  })

  // check space delegations
  const delegations = await spaces.getDelegations('mailto:email@dag.house')

  if (!delegations) {
    return t.fail('no delegation for email')
  }

  const del = await stringToDelegation(delegations[0])

  t.deepEqual(del.audience.did(), service.did())
  t.deepEqual(del.capabilities[0].can, '*')
  t.deepEqual(del.capabilities[0].with, space.did())
})

test('should save first space delegation', async (t) => {
  const { issuer, service, conn, mf } = t.context

  await createSpace(issuer, service, conn, 'first@dag.house')

  const spaces = await mf.getKVNamespace('SPACES')

  const delEncoded = await spaces.get('mailto:first@dag.house', {
    type: 'json',
  })

  // @ts-ignore
  t.assert(delEncoded.length === 1)
})

test('should save multiple space delegation', async (t) => {
  const { issuer, service, conn, mf } = t.context

  await createSpace(issuer, service, conn, 'multiple@dag.house')
  await createSpace(issuer, service, conn, 'multiple@dag.house')

  const spaces = await mf.getKVNamespace('SPACES')

  const delEncoded = await spaces.get('mailto:multiple@dag.house', {
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
        space: issuer.did(),
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
