/* eslint-disable unicorn/no-null */
import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { delegate, parseLink } from '@ucanto/core'
import * as Store from '../../src/store.js'
import * as Capability from '../../src/top.js'

import {
  alice,
  service as w3,
  mallory as account,
  bob,
} from '../helpers/fixtures.js'
import { createCarCid } from '../helpers/utils.js'

const top = async () =>
  Capability.top.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
  })

const store = async () =>
  Store.store.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
    proofs: [await top()],
  })

describe('store capabilities', function () {
  it('store/add can be derived from *', async () => {
    const add = Store.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        link: parseLink('bafkqaaa'),
        size: 0,
      },
      proofs: [await top()],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'store/add')
    assert.deepEqual(result.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
    })
  })

  it('store/add can be derived from store/*', async () => {
    const add = Store.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        link: parseLink('bafkqaaa'),
        size: 0,
      },
      proofs: [await store()],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'store/add')
    assert.deepEqual(result.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
    })
  })

  it('store/add can be derived from store/* derived from *', async () => {
    const store = await Store.store.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await top()],
    })

    const add = Store.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        link: parseLink('bafkqaaa'),
        size: 0,
      },
      proofs: [store],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'store/add')
    assert.deepEqual(result.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
    })
  })

  it('store/add sholud fail when escalating size constraint', async () => {
    const delegation = await Store.add.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: {
        size: 1024,
      },
      proofs: [await top()],
    })

    {
      const add = Store.add.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        nb: {
          size: 1000,
          link: parseLink('bafkqaaa'),
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      if (result.error) {
        assert.fail(result.message)
      }

      assert.deepEqual(result.audience.did(), w3.did())
      assert.equal(result.capability.can, 'store/add')
      assert.deepEqual(result.capability.nb, {
        link: parseLink('bafkqaaa'),
        size: 1000,
      })
    }

    {
      const add = Store.add.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        nb: {
          size: 2048,
          link: parseLink('bafkqaaa'),
        },
        proofs: [await delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      assert.equal(result.error, true)
      assert(String(result).includes('violation: 2048 > 1024'))
    }
  })

  const fixtures = [null, '1024', 12.24, true]
  for (const size of fixtures) {
    const json = JSON.stringify(size)
    it(`store/add size must be an int not ${json}`, async () => {
      const proofs = [await top()]
      assert.throws(() => {
        Store.add.invoke({
          issuer: alice,
          audience: w3,
          with: account.did(),
          nb: {
            link: parseLink('bafkqaaa'),
            // @ts-expect-error
            size,
          },
          proofs,
        })
      }, /Expected value of type/)
    })

    it(`store/add validation fails when size is ${json}`, async () => {
      const add = await delegate({
        issuer: alice,
        audience: w3,
        capabilities: [
          {
            can: 'store/add',
            with: account.did(),
            nb: {
              link: await createCarCid('bafkqaaa'),
              size,
            },
          },
        ],
        proofs: [await top()],
      })

      const result = await access(add, {
        // @ts-expect-error - size type doesn't not match because we are testing fails
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      assert.equal(result.error, true)
      assert(String(result).includes('Expected value of type'))
    })
  }

  it('store/add size must be an int', async () => {
    const proofs = [await top()]
    assert.throws(() => {
      Store.add.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        nb: {
          link: parseLink('bafkqaaa'),
          size: 1024.2,
        },
        proofs,
      })
    }, /Expected value of type integer instead got 1024\.2/)
  })
})
