import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import * as SpaceIndex from '../../src/space/index.js'
import * as Capability from '../../src/top.js'
import {
  alice,
  service as w3,
  mallory as account,
  bob,
} from '../helpers/fixtures.js'
import { createCarCid, validateAuthorization } from '../helpers/utils.js'

const top = async () =>
  Capability.top.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
  })

const index = async () =>
  SpaceIndex.index.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
    proofs: [await top()],
  })

describe('index capabilities', function () {
  it('space/index/add can be derived from *', async () => {
    const add = SpaceIndex.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        index: await createCarCid('test'),
      },
      proofs: [await top()],
    })

    const result = await access(await add.delegate(), {
      capability: SpaceIndex.add,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'space/index/add')
    assert.deepEqual(result.ok.capability.nb, {
      index: await createCarCid('test'),
    })
  })

  it('space/index/add can be derived from index/*', async () => {
    const add = SpaceIndex.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        index: await createCarCid('test'),
      },
      proofs: [await index()],
    })

    const result = await access(await add.delegate(), {
      capability: SpaceIndex.add,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'space/index/add')
    assert.deepEqual(result.ok.capability.nb, {
      index: await createCarCid('test'),
    })
  })

  it('space/index/add can be derived from index/* derived from *', async () => {
    const index = await SpaceIndex.index.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await top()],
    })

    const add = SpaceIndex.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        index: await createCarCid('test'),
      },
      proofs: [index],
    })

    const result = await access(await add.delegate(), {
      capability: SpaceIndex.add,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'space/index/add')
    assert.deepEqual(result.ok.capability.nb, {
      index: await createCarCid('test'),
    })
  })

  it('space/index/add should fail when escalating index constraint', async () => {
    const delegation = await SpaceIndex.add.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: {
        index: await createCarCid('test'),
      },
      proofs: [await top()],
    })

    const add = SpaceIndex.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        index: await createCarCid('test2'),
      },
      proofs: [delegation],
    })

    const result = await access(await add.delegate(), {
      capability: SpaceIndex.add,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    assert.ok(result.error)
    assert(result.error.message.includes('violates imposed index constraint'))
  })
})
