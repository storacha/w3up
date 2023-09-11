import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Shard from '../../src/shard.js'
import { service, alice, readmeCID } from '../helpers/fixtures.js'

describe('shard/get', function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Shard.get.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        cid: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Shard.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'shard/get')
      assert.deepEqual(result.ok.capability.nb, {
        cid: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Shard.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        cid: readmeCID,
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'shard/get' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Shard.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'shard/get')
      assert.deepEqual(result.ok.capability.nb, {
        cid: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Shard.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        cid: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Shard.get,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.shard', async function () {
    assert.throws(() => {
      Shard.get.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "cid"/)
  })
})
