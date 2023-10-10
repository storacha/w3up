import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Consumer from '../../src/consumer.js'
import { bob, service, alice } from '../helpers/fixtures.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('consumer/get', function () {
  const agent = alice
  const space = bob
  it('can be invoked by the service on the service', async function () {
    const invocation = Consumer.get.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Consumer.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'consumer/get')
      assert.deepEqual(result.ok.capability.nb, {
        consumer: space.did(),
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Consumer.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'consumer/get' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Consumer.get,
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
      assert.equal(result.ok.capability.can, 'consumer/get')
      assert.deepEqual(result.ok.capability.nb, {
        consumer: space.did(),
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Consumer.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Consumer.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.consumer', async function () {
    assert.throws(() => {
      Consumer.get.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "consumer"/)
  })
})

describe('consumer/has', function () {
  const agent = alice
  const space = bob
  it('can be invoked by the service on the service', async function () {
    const invocation = Consumer.has.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Consumer.has,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'consumer/has')
      assert.deepEqual(result.ok.capability.nb, {
        consumer: space.did(),
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Consumer.has.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'consumer/has' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Consumer.has,
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
      assert.equal(result.ok.capability.can, 'consumer/has')
      assert.deepEqual(result.ok.capability.nb, {
        consumer: space.did(),
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Consumer.has.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        consumer: space.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Consumer.has,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.consumer', async function () {
    assert.throws(() => {
      Consumer.has.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "consumer"/)
  })
})
