import assert from 'assert'
import { access } from '@ucanto/validator'
import { Principal } from '@ucanto/principal'
import { delegate, parseLink } from '@ucanto/core'
import * as Upload from '../../src/capabilities/upload.js'
import { codec as CARCodec } from '@ucanto/transport/car'
import { codec as CBOR } from '@ucanto/transport/cbor'
import {
  alice,
  bob,
  service as w3,
  mallory as account,
} from '../helpers/fixtures.js'

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
    const upload = await Upload.upload
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        proofs: [await any],
      })
      .delegate()

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      caveats: {
        root: parseLink('bafkqaaa'),
      },
      proofs: [upload],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.caveats, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/add can be derived from *', async () => {
    const upload = Upload.upload.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const add = Upload.add.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      caveats: {
        root: parseLink('bafkqaaa'),
      },
      proofs: [await upload.delegate()],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.caveats, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('creating upload/add throws if shards is contains non CAR cid', async () => {
    const proofs = [await any]
    assert.throws(() => {
      Upload.add.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        caveats: {
          root: parseLink('bafkqaaa'),
          shards: [
            // @ts-expect-error - not a CAR cid
            parseLink('bafkqaaa'),
          ],
        },
        proofs,
      })
    }, /Expected link to be CID with 0x202 codec/)
  })

  it('validator fails on upload/add if shard contains non CAR cid', async () => {
    const add = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/add',
          with: account.did(),
          root: parseLink('bafkqaaa'),
          shards: [parseLink('bafkqaaa')],
        },
      ],
      proofs: [await any],
    })

    const result = await access(add, {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })
    assert.equal(result.error, true)
    assert.match(String(result), /Expected link to be CID with 0x202 codec/)
  })

  it('upload/add works with shards that are CAR cids', async () => {
    const cbor = await CBOR.write({ hello: 'world' })
    const shard = await CARCodec.write({ roots: [cbor] })
    const add = Upload.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      caveats: {
        root: parseLink('bafkqaaa'),
        shards: [shard.cid],
      },
      proofs: [await any],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/add')
    assert.deepEqual(result.capability.caveats, {
      root: parseLink('bafkqaaa'),
      shards: [shard.cid],
    })
  })

  it('upload/add capability requires with to be a did', () => {
    assert.throws(() => {
      Upload.add.invoke({
        issuer: alice,
        audience: w3,
        // @ts-expect-error - not a CAR cid
        with: 'mailto:alice@web.mail',
        caveats: {
          root: parseLink('bafkqaaa'),
        },
      })
    }, /Expected did: URI instead got mailto:alice@web.mail/)
  })

  it('upload/add validation requires with to be a did', async () => {
    const add = await delegate({
      issuer: alice,
      audience: w3,
      capabilities: [
        {
          can: 'upload/add',
          with: 'mailto:alice@web.mail',
          root: parseLink('bafkqaaa'),
        },
      ],
      proofs: [await any],
    })

    const result = await access(add, {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    assert.equal(result.error, true)
    assert.match(
      String(result),
      /Expected did: URI instead got mailto:alice@web.mail/
    )
  })

  it('upload/add should work when escalating root when caveats not imposed on proof', async () => {
    const delegation = Upload.add
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        caveats: {},
        proofs: [await any],
      })
      .delegate()

    const cbor = await CBOR.write({ hello: 'world' })

    const add = Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      caveats: {
        root: cbor.cid,
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.capability.caveats, {
      root: cbor.cid,
    })
  })

  it('upload/add should fail when escalating root', async () => {
    const delegation = Upload.add
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        caveats: {
          root: parseLink('bafkqaaa'),
        },
        proofs: [await any],
      })
      .delegate()

    const cbor = await CBOR.write({ hello: 'world' })

    const add = await Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      caveats: {
        root: cbor.cid,
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    assert.equal(result.error, true)
    assert.match(
      String(result),
      /bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae violates imposed root constraint bafkqaaa/
    )
  })

  it('upload/add should fail when escalating shards', async () => {
    const cbor = await CBOR.write({ hello: 'world' })
    const shard = await CARCodec.write({ roots: [cbor] })
    const delegation = Upload.add
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        caveats: {
          shards: [shard.cid],
        },
        proofs: [await any],
      })
      .delegate()

    const add = await Upload.add.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      caveats: {
        root: parseLink('bafkqaaa'),
      },
      proofs: [await delegation],
    })

    const result = await access(await add.delegate(), {
      capability: Upload.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    assert.equal(result.error, true)
    assert.match(
      String(result),
      /imposed shards constraint bagbaieraha2ehrhh5ycdp76hijjo3eablsaikm5jlrbt4vmcn32p7reg3uiq/
    )
  })

  it('upload/list can be derived from upload/* derived from *', async () => {
    const list = Upload.list.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      proofs: [await any],
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.caveats, {})
  })

  it('upload/list can be derived from *', async () => {
    const upload = Upload.upload.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const list = Upload.list.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await upload.delegate()],
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.caveats, {})
  })

  it('upload/list can be derived from upload/list', async () => {
    const delegation = Upload.list.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const list = Upload.list.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await delegation.delegate()],
    })

    const result = await access(await list.delegate(), {
      capability: Upload.list,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/list')
    assert.deepEqual(result.capability.caveats, {})
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

    const result = await access(list, {
      capability: Upload.list,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })
    assert.equal(result.error, true)
    assert.match(
      String(result),
      /Expected did: URI instead got mailto:alice@web.mail/
    )
  })

  it('upload/remove can be derived from upload/* derived from *', async () => {
    const remove = Upload.remove.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      proofs: [await any],
      caveats: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    assert.deepEqual(result.capability.caveats, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/remove can be derived from *', async () => {
    const upload = Upload.upload.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
    })

    const remove = Upload.remove.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await upload.delegate()],
      caveats: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    assert.deepEqual(result.capability.caveats, {
      root: parseLink('bafkqaaa'),
    })
  })

  it('upload/remove can be derived from upload/remove', async () => {
    const delegation = Upload.remove.invoke({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await any],
      caveats: {
        root: parseLink('bafkqaaa'),
      },
    })

    const remove = Upload.remove.invoke({
      audience: w3,
      issuer: bob,
      with: account.did(),
      proofs: [await delegation.delegate()],
      caveats: {
        root: parseLink('bafkqaaa'),
      },
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'upload/remove')
    assert.deepEqual(result.capability.caveats, {
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

    const result = await access(remove, {
      capability: Upload.remove,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })
    assert.equal(result.error, true)
    assert.match(
      String(result),
      /Expected did: URI instead got mailto:alice@web.mail/
    )
  })

  it('upload/remove should fail when escalating root', async () => {
    const delegation = Upload.remove
      .invoke({
        issuer: alice,
        audience: bob,
        with: account.did(),
        caveats: {
          root: parseLink('bafkqaaa'),
        },
        proofs: [await any],
      })
      .delegate()

    const cbor = await CBOR.write({ hello: 'world' })

    const remove = await Upload.remove.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      caveats: {
        root: cbor.cid,
      },
      proofs: [await delegation],
    })

    const result = await access(await remove.delegate(), {
      capability: Upload.remove,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    assert.equal(result.error, true)
    assert.match(
      String(result),
      /bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae violates imposed root constraint bafkqaaa/
    )
  })
})
