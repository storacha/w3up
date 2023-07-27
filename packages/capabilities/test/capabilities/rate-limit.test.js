import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as RateLimit from '../../src/rate-limit.js'
import { bob, service, alice } from '../helpers/fixtures.js'
import { createAuthorization } from '../helpers/utils.js'

const provider = 'did:web:test.web3.storage'

describe('rate-limit/add', function () {
  it('can by invoked as account', async function () {
    const agent = alice
    const space = bob
    const auth = RateLimit.add.invoke({
      issuer: agent,
      audience: service,
      with: provider,
      nb: {
        subject: space.did(),
        rate: 0,
      },
      // TODO: check in with @gozala about whether passing provider as account makes sense
      proofs: await createAuthorization({ agent, service, account: provider }),
    })
    const result = await access(await auth.delegate(), {
      capability: RateLimit.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/add')
      assert.deepEqual(result.ok.capability.nb, {
        resource: space.did(),
        rate: 0,
      })
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const space = bob
    const auth = RateLimit.add.invoke({
      issuer: agent,
      audience: service,
      with: provider,
      nb: {
        subject: space.did(),
        rate: 0,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: RateLimit.add,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.resource', async function () {
    assert.throws(() => {
      RateLimit.add.invoke({
        issuer: alice,
        audience: service,
        with: provider,
        // @ts-ignore
        nb: {
          rate: 0,
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "resource"/)
  })

  it('requires nb.rate', async function () {
    assert.throws(() => {
      RateLimit.add.invoke({
        issuer: alice,
        audience: service,
        with: provider,
        // @ts-ignore
        nb: {
          subject: alice.did(),
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "rate"/)
  })
})

describe('rate-limit/remove', function () {
  it('can by invoked as account', async function () {
    const agent = alice
    const space = bob
    const auth = RateLimit.remove.invoke({
      issuer: agent,
      audience: service,
      with: provider,
      nb: {
        id: '123',
      },
      // TODO: check in with @gozala about whether passing provider as account makes sense
      proofs: await createAuthorization({ agent, service, account: provider }),
    })
    const result = await access(await auth.delegate(), {
      capability: RateLimit.remove,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/remove')
      assert.deepEqual(result.ok.capability.nb, {
        resource: space.did(),
      })
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const auth = RateLimit.remove.invoke({
      issuer: agent,
      audience: service,
      with: provider,
      nb: {
        id: '123',
      },
    })

    const result = await access(await auth.delegate(), {
      capability: RateLimit.remove,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.resource', async function () {
    assert.throws(() => {
      RateLimit.remove.invoke({
        issuer: alice,
        audience: service,
        with: provider,
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "resource"/)
  })
})
