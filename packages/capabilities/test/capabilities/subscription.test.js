import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Subscription from '../../src/subscription.js'
import { bob, service, alice } from '../helpers/fixtures.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('subscription/get', function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Subscription.get.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        subscription: bob.did(),
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Subscription.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'subscription/get')
      assert.deepEqual(result.ok.capability.nb, {
        subscription: bob.did(),
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Subscription.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        subscription: bob.did(),
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'subscription/get' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Subscription.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'subscription/get')
      assert.deepEqual(result.ok.capability.nb, {
        subscription: bob.did(),
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Subscription.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        subscription: bob.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Subscription.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.subscription', async function () {
    assert.throws(() => {
      Subscription.get.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "subscription"/)
  })
})
