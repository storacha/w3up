/* eslint-disable unicorn/no-null */
import assert from 'assert'
import { access } from '@ucanto/validator'
import { Principal } from '@ucanto/principal'
import { delegate, parseLink } from '@ucanto/core'
import * as Store from '../../src/capabilities/store.js'
import {
  alice,
  service as w3,
  mallory as account,
  bob,
} from '../helpers/fixtures.js'

describe('store capabilities', function () {
  const proof = delegate({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: '*',
        with: account.did(),
      },
    ],
  })

  it('should be able to derive from *', async () => {
    const add = Store.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      caveats: {
        link: parseLink('bafkqaaa'),
      },
      proofs: [await proof],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'store/add')
    assert.deepEqual(result.capability.caveats, {
      link: parseLink('bafkqaaa'),
    })
  })

  it('store/add sholud fail when escalating size constraint', async () => {
    const delegation = await Store.add
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        caveats: {
          size: 1024,
        },
        proofs: [await proof],
      })
      .delegate()

    {
      const add = Store.add.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        caveats: {
          size: 1000,
          link: parseLink('bafkqaaa'),
        },
        proofs: [await delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Principal,
        canIssue: (claim, issuer) => {
          return claim.with === issuer
        },
      })

      if (result.error) {
        assert.fail(result.message)
      }

      assert.deepEqual(result.audience.did(), w3.did())
      assert.equal(result.capability.can, 'store/add')
      assert.deepEqual(result.capability.caveats, {
        link: parseLink('bafkqaaa'),
        size: 1000,
      })
    }

    {
      const add = Store.add.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        caveats: {
          size: 2048,
          link: parseLink('bafkqaaa'),
        },
        proofs: [await delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Principal,
        canIssue: (claim, issuer) => {
          return claim.with === issuer
        },
      })

      assert.equal(result.error, true)
      assert.match(String(result), /violation: 2048 > 1024/)
    }
  })

  const fixtures = [null, '1024', 12.24, true]
  for (const size of fixtures) {
    const json = JSON.stringify(size)
    it(`store/add size must be an int not ${json}`, async () => {
      const proofs = [await proof]
      assert.throws(() => {
        Store.add.invoke({
          issuer: alice,
          audience: w3,
          with: account.did(),
          caveats: {
            // @ts-expect-error
            size,
          },
          proofs,
        })
      }, /Expecting an Integer but instead got/)
    })

    it(`store/add validation fails when size is ${json}`, async () => {
      const add = await delegate({
        issuer: alice,
        audience: w3,
        capabilities: [
          {
            can: 'store/add',
            with: account.did(),
            root: parseLink('bafkqaaa'),
            size,
          },
        ],
        proofs: [await proof],
      })

      const result = await access(add, {
        capability: Store.add,
        principal: Principal,
        canIssue: (claim, issuer) => {
          return claim.with === issuer
        },
      })

      assert.equal(result.error, true)
      assert.match(String(result), /Expecting an Integer but instead got/)
    })
  }

  it('store/add size must be an int', async () => {
    const proofs = [await proof]
    assert.throws(() => {
      Store.add.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        caveats: {
          size: 1024.2,
        },
        proofs,
      })
    }, /Expecting an Integer but instead got: number 1024\.2/)
  })
})
