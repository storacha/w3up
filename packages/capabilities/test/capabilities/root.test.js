import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Root from '../../src/root.js'
import { service, alice, readmeCID } from '../helpers/fixtures.js'

describe('root/get', async function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Root.get.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        cid: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Root.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'root/get')
      assert.deepEqual(result.ok.capability.nb, {
        cid: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Root.get.invoke({
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
          capabilities: [{ with: service.did(), can: 'root/get' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Root.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'root/get')
      assert.deepEqual(result.ok.capability.nb, {
        cid: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Root.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        cid: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Root.get,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.cid', async function () {
    assert.throws(() => {
      Root.get.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "cid"/)
  })
})
