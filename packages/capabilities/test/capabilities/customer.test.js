import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Customer from '../../src/customer.js'
import { bobAccount, service, alice } from '../helpers/fixtures.js'

describe('customer/get', function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Customer.get.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        customer: bobAccount.did(),
      }
    })
    const result = await access(await invocation.delegate(), {
      capability: Customer.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'customer/get')
      assert.deepEqual(result.ok.capability.nb, {
        customer: bobAccount.did(),
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Customer.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        customer: bobAccount.did(),
      },
      proofs: [await delegate({
        issuer: service, audience: agent,
        capabilities: [{ with: service.did(), can: 'customer/get' }]
      })],
    })
    const result = await access(await auth.delegate(), {
      capability: Customer.get,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${JSON.stringify(result.error.message)}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'customer/get')
      assert.deepEqual(result.ok.capability.nb, {
        customer: bobAccount.did(),
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Customer.get.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        customer: bobAccount.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Customer.get,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.customer', async function () {
    assert.throws(() => {
      Customer.get.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "customer"/)
  })
})
