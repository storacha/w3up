import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { delegate, parseLink } from '@ucanto/core'
import * as Upload from '../../src/upload.js'
import {
  alice,
  bob,
  service as w3,
  mallory as account,
} from '../helpers/fixtures.js'
import { createCarCid, parseCarLink, createCborCid } from '../helpers/utils.js'

describe('upload capabilities', function () {
  // delegation from account to agent
  const any = delegate({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: '*',
        with: account.did(),
      },
    ],
  })

  it('upload/add can be derived from upload/* derived from *', async () => {
    const upload = await Upload.upload.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const root = await createCborCid('root')

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        root,
      },
      proofs: [upload],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.nb, {
      root,
    })
  })

  it('upload/add can be derived from *', async () => {
    const upload = await Upload.upload.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const root = await createCborCid('root')
    const add = Upload.add.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      nb: {
        root,
      },
      proofs: [upload],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.nb, {
      root,
    })
  })

  it('creating upload/add throws if shards contains a non CAR cid', async () => {
    const proofs = [await any]
    const root = await createCborCid('root')
    assert.throws(() => {
      Upload.add.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        nb: {
          root,
          shards: [parseCarLink('bafkqaaa')],
        },
        proofs,
      })
    }, /Expected link to be CID with 0x202 codec/)
  })

  it('validator fails on upload/add if shard contains non CAR cid', async () => {
    const root = await createCborCid('root')
    const add = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/add',
          with: account.did(),
          nb: {
            root,
            shards: [parseCarLink('bafkqaaa')],
          },
        },
      ],
      proofs: [await any],
    })

    const result = await access(add, {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })
    assert.equal(result.error, true)
    assert(String(result).includes('Expected link to be CID with 0x202 codec'))
  })

  it('upload/add works with shards that are CAR cids', async () => {
    const shard = await createCarCid('shard')
    const root = await createCborCid('root')
    const add = Upload.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: {
        root,
        shards: [shard],
      },
      proofs: [await any],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.nb, {
      root,
      shards: [shard],
    })
  })

  it('upload/add capability requires with to be a did', async () => {
    const root = await createCborCid('root')
    assert.throws(() => {
      Upload.add.invoke({
        issuer: alice,
        audience: w3,
        // @ts-expect-error - not a CAR cid
        with: 'mailto:alice@web.mail',
        nb: {
          root,
        },
      })
    }, /Expected did: URI instead got mailto:alice@web.mail/)
  })

  it('upload/add validation requires with to be a did', async () => {
    const root = await createCborCid('root')
    const add = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/add',
          with: 'mailto:alice@web.mail',
          root,
        },
      ],
      proofs: [await any],
    })

    // @ts-expect-error testing error
    const result = await access(add, {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'Expected did: URI instead got mailto:alice@web.mail'
      )
    )
  })

  it('upload/add should work when escalating root when caveats not imposed on proof', async () => {
    const delegation = await Upload.add.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const root = await createCborCid('root')

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        root,
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.capability.nb, {
      root,
    })
  })

  it('upload/add should fail when escalating root', async () => {
    const root = await createCborCid('hello')
    const delegation = Upload.add
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        nb: {
          root,
        },
        proofs: [await any],
      })
      .delegate()

    const root2 = await createCborCid('hello2')

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        root: root2,
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'bafyreig7xrtnfhkdu4wt3fbufl4bppd5r5ixrowmi5ekw5vjundxynmzj4 violates imposed root constraint bafyreiglqnkzhzh2gyz4zfy7zpi6wcamumrclarakshlocd35l4o63l76q'
      )
    )
  })

  it('upload/add should fail when escalating shards', async () => {
    const shard = await createCarCid('shard')
    const delegation = await Upload.add.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: {
        shards: [shard],
      },
      proofs: [await any],
    })

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        root: await createCborCid('world2'),
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Verifier,
      authority: w3,
    })

    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'imposed shards constraint bagbaierar5jtiax76ossjdhyqshypwkkrztwp3zch7voido4pmuxrcoyq7za'
      )
    )
  })

  it('upload/list can be derived from upload/* derived from *', async () => {
    const list = Upload.list.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      proofs: [await any],
      nb: {},
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.nb, {})
  })

  it('upload/list can be derived from *', async () => {
    const upload = await Upload.upload.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const list = Upload.list.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [upload],
      nb: {},
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.nb, {})
  })

  it('upload/list can be derived from upload/list', async () => {
    const delegation = Upload.list.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
      nb: {},
    })

    const list = Upload.list.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await delegation.delegate()],
      nb: {},
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.nb, {})
  })

  it('upload/list capability requires with to be a did', () => {
    assert.throws(() => {
      Upload.list.invoke({
        issuer: alice,
        audience: w3,
        // @ts-expect-error - not a CAR cid
        with: 'mailto:alice@web.mail',
      })
    }, /Expected did: URI instead got mailto:alice@web.mail/)
  })

  it('upload/list validation requires with to be a did', async () => {
    const list = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/list',
          with: 'mailto:alice@web.mail',
          root: parseLink('bafkqaaa'),
        },
      ],
      proofs: [await any],
    })

    // @ts-ignore
    const result = await access(list, {
      capability: Upload.list,
      principal: Verifier,
      authority: w3,
    })
    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'Expected did: URI instead got mailto:alice@web.mail'
      )
    )
  })

  it('upload/remove can be derived from upload/* derived from *', async () => {
    const remove = Upload.remove.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      proofs: [await any],
      nb: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    assert.deepEqual(result.capability.nb, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/remove can be derived from *', async () => {
    const upload = await Upload.upload.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const remove = Upload.remove.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [upload],
      nb: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    assert.deepEqual(result.capability.nb, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/remove can be derived from upload/remove', async () => {
    const delegation = Upload.remove.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
      nb: {
        root: parseLink('bafkqaaa'),
      },
    })

    const remove = Upload.remove.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await delegation.delegate()],
      nb: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Verifier,
      authority: w3,
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    // @ts-ignore
    assert.deepEqual(result.capability.nb, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/remove capability requires with to be a did', () => {
    assert.throws(() => {
      Upload.remove.invoke({
        issuer: alice,
        audience: w3,
        // @ts-expect-error - not a DID
        with: 'mailto:alice@web.mail',
        root: parseLink('bafkqaaa'),
      })
    }, /Expected did: URI instead got mailto:alice@web.mail/)
  })

  it('upload/list validation requires with to be a did', async () => {
    const remove = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/remove',
          with: 'mailto:alice@web.mail',
          root: parseLink('bafkqaaa'),
        },
      ],
      proofs: [await any],
    })

    // @ts-ignore
    const result = await access(remove, {
      capability: Upload.remove,
      principal: Verifier,
      authority: w3,
    })
    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'Expected did: URI instead got mailto:alice@web.mail'
      )
    )
  })

  it('upload/remove should fail when escalating root', async () => {
    const delegation = Upload.remove
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        nb: {
          root: parseLink('bafkqaaa'),
        },
        proofs: [await any],
      })
      .delegate()

    const root = await createCarCid('root')

    const remove = Upload.remove.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: {
        root,
      },
      proofs: [await delegation],
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Verifier,
      authority: w3,
    })

    assert.equal(result.error, true)
    assert(
      String(result).includes(
        'bagbaieral6qo2fk7dph2ltggtw2qc6hda23hawvpc4duykdsh4soobxfe55a violates imposed root constraint bafkqaaa'
      )
    )
  })
})
