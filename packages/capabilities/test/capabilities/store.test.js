/* eslint-disable unicorn/no-null */
import { delegate, parseLink } from '@ucanto/core'
import { Verifier } from '@ucanto/principal'
import { access } from '@ucanto/validator'
import { assert } from 'chai'
import * as Store from '../../src/store.js'
import * as Capability from '../../src/top.js'

import {
  mallory as account,
  alice,
  bob,
  service as w3,
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

const commP = {
  link: parseLink(
    'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
  ),
  size: 128,
}

describe('store capabilities', function () {
  it('store/add can be derived from *', async () => {
    const add = Store.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        link: parseLink('bafkqaaa'),
        size: 0,
        piece: commP,
      },
      proofs: [await top()],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'store/add')
    assert.deepEqual(result.ok.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
      piece: commP,
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
        piece: commP,
      },
      proofs: [await store()],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'store/add')
    assert.deepEqual(result.ok.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
      piece: commP,
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
        piece: commP,
      },
      proofs: [store],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'store/add')
    assert.deepEqual(result.ok.capability.nb, {
      link: parseLink('bafkqaaa'),
      size: 0,
      piece: commP,
    })
  })

  it('store/add should fail when escalating size constraint', async () => {
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
          piece: commP,
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      if (result.error) {
        assert.fail(result.error.message)
      }

      assert.deepEqual(result.ok.audience.did(), w3.did())
      assert.equal(result.ok.capability.can, 'store/add')
      assert.deepEqual(result.ok.capability.nb, {
        link: parseLink('bafkqaaa'),
        size: 1000,
        piece: commP,
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
          piece: commP,
        },
        proofs: [await delegation],
      })

      const result = await access(await add.delegate(), {
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      assert.ok(result.error)
      assert.match(
        String(result.error),
        /"nb.size: 1024" violation: 2048 > 1024/
      )
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
            piece: commP,
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
              piece: commP,
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

      assert.ok(result.error)
      assert.match(String(result.error), /Expected value of type/)
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
          piece: commP,
        },
        proofs,
      })
    }, /Expected value of type integer instead got 1024\.2/)
  })

  it('piece can be unconstrained', async () => {
    const proof = await Store.add.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
      nb: {
        link: await createCarCid('bafkqaaa'),
        size: 1024,
      },
    })

    const add = await Store.add
      .invoke({
        issuer: bob,
        audience: w3,
        with: alice.did(),
        nb: {
          link: await createCarCid('bafkqaaa'),
          size: 1024,
          piece: commP,
        },
        proofs: [proof],
      })
      .delegate()

    const result = await access(add, {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    assert.ok(result.ok)
  })

  it('can not partially constrain piece', async () => {
    const proof = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
          nb: {
            link: await createCarCid('bafkqaaa'),
            size: 1024,
            piece: {
              size: 2048,
            },
          },
        },
      ],
    })

    const add = await Store.add
      .invoke({
        issuer: bob,
        audience: w3,
        with: alice.did(),
        nb: {
          link: await createCarCid('bafkqaaa'),
          size: 1024,
          piece: {
            link: commP.link,
            size: 2048,
          },
        },
        proofs: [proof],
      })
      .delegate()

    const result = await access(add, {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    assert.ok(result.error?.message.includes('contains invalid field "link"'))
  })

  it('piece constraints are verified', async () => {
    const piece = {
      ...commP,
      size: 2048,
    }
    const proof = await Store.add.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
      nb: {
        link: await createCarCid('bafkqaaa'),
        size: 1024,
        piece,
      },
    })

    for (const input of [
      { size: 0 },
      { size: 2047 },
      { size: 2049 },
      { size: 3000 },
      { size: 2048, ok: true },
    ]) {
      const add = await Store.add
        .invoke({
          issuer: bob,
          audience: w3,
          with: alice.did(),
          nb: {
            link: await createCarCid('bafkqaaa'),
            size: 1024,
            piece: {
              ...piece,
              size: input.size,
            },
          },
          proofs: [proof],
        })
        .delegate()

      const result = await access(add, {
        capability: Store.add,
        principal: Verifier,
        authority: w3,
      })

      if (input.ok) {
        assert.ok(result.ok)
      } else {
        assert.match(String(result.error), /piece.size/)
      }
    }

    const add = await Store.add
      .invoke({
        issuer: bob,
        audience: w3,
        with: alice.did(),
        nb: {
          link: await createCarCid('bafkqaaa'),
          size: 1024,
          piece: {
            ...piece,
            link: parseLink(
              'bafkreiebxxq5gathekjxvf6bvr4wwrw3nc2tgxyuiaxv5fhwhxk3ckn7x4'
            ),
          },
        },
        proofs: [proof],
      })
      .delegate()

    const result = await access(add, {
      capability: Store.add,
      principal: Verifier,
      authority: w3,
    })

    assert.match(String(result.error), /piece.link/)
  })
})
