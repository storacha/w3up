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

  it('upload/add can be derived from upload/* derived from *', async () => {
    const add = Upload.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      caveats: {
        root: parseLink('bafkqaaa'),
      },
      proofs: [await proof],
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
      proofs: [await proof],
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
    const proofs = [await proof]
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
      proofs: [await proof],
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
      proofs: [await proof],
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
      proofs: [await proof],
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
})
