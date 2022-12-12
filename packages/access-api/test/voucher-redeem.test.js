/* eslint-disable unicorn/prefer-number-properties */
import * as Voucher from '@web3-storage/capabilities/voucher'
import * as Top from '@web3-storage/capabilities/top'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context } from './helpers/context.js'
import { Spaces } from '../src/models/spaces.js'
import { Signer } from '@ucanto/principal/ed25519'
// @ts-ignore
import isSubset from 'is-subset'

import assert from 'assert'

/** @type {typeof assert} */
const t = assert
const test = it

describe('voucher/redeem', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })

  test('should return voucher/redeem', async function () {
    const { issuer, service, conn, d1 } = ctx

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

    const delegation = stringToDelegation(claim)

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
        facts: [{ space: { name: 'test' } }],
      })

      .execute(conn)

    if (redeem?.error) {
      return t.fail()
    }

    const spaces = new Spaces(d1)

    // check db for space
    t.ok(
      isSubset(await spaces.get(space.did()), {
        did: space.did(),
        product: 'product:free',
        email: 'email@dag.house',
        agent: issuer.did(),
      })
    )

    // check space delegations
    const results = await spaces.getByEmail('mailto:email@dag.house')

    if (!results) {
      return t.fail('no delegation for email')
    }

    if (!results[0].delegation) {
      return t.fail('no delegation for email')
    }

    const del = await stringToDelegation(
      /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/types').Top]>} */ (
        results[0].delegation
      )
    )

    t.deepEqual(del.audience.did(), service.did())
    t.deepEqual(del.capabilities[0].can, '*')
    t.deepEqual(del.capabilities[0].with, space.did())
    // eslint-disable-next-line unicorn/no-null
    t.deepEqual(del.facts[0], null)
  })

  test('should fail with wrong resource', async function () {
    const { issuer, service, conn } = ctx

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
      t.ok(redeem.error)
      t.deepEqual(
        redeem.message,
        `Resource ${issuer.did()} does not match service did ${service.did()}`
      )
    } else {
      t.fail('should fail')
    }
  })

  test('should fail multiple voucher/redeem with same space did', async function () {
    const { issuer, service, conn } = ctx

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

    const delegation = stringToDelegation(claim)

    const redeemInv = Voucher.redeem.invoke({
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
        await Voucher.top.delegate({
          issuer: space,
          audience: service,
          with: space.did(),
          expiration: Infinity,
        }),
      ],
      facts: [{ space: { name: 'test' } }],
    })

    const redeem = await redeemInv.execute(conn)

    if (redeem?.error) {
      return t.fail(redeem.message)
    }

    const redeem2 = await redeemInv.execute(conn)

    t.ok(redeem2.error)
    if (redeem2.error) {
      t.deepEqual(redeem2.message, `Space ${space.did()} already registered.`)
    }
  })

  test('should not fail with empty metadata', async function () {
    const { issuer, service, conn } = ctx

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
      return t.fail(redeem.message)
    }
  })
})
