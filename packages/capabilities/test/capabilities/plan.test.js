import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Plan from '../../src/plan.js'
import { service, alice, bob } from '../helpers/fixtures.js'
import { createAuthorization, validateAuthorization } from '../helpers/utils.js'

describe('plan/get', function () {
  const agent = alice
  const account = 'did:mailto:mallory.com:mallory'
  it('can invoke as an account', async function () {
    const auth = Plan.get.invoke({
      issuer: agent,
      audience: service,
      with: account,
      proofs: await createAuthorization({ agent, service, account }),
    })
    const result = await access(await auth.delegate(), {
      capability: Plan.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/get')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const auth = Plan.get.invoke({
      issuer: agent,
      audience: service,
      with: account,
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('fails when invoked by a different agent', async function () {
    const auth = Plan.get.invoke({
      issuer: bob,
      audience: service,
      with: account,
      proofs: await createAuthorization({ agent, service, account }),
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('can delegate plan/get', async function () {
    const invocation = Plan.get.invoke({
      issuer: bob,
      audience: service,
      with: account,
      proofs: [
        await Plan.get.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.get,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/get')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })
})

describe('plan/set', function () {
  const agent = alice
  const account = 'did:mailto:mallory.com:mallory'
  it('can invoke as an account', async function () {
    const auth = Plan.set.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
      proofs: await createAuthorization({ agent, service, account }),
    })
    const result = await access(await auth.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/set')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const auth = Plan.set.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('fails when invoked by a different agent', async function () {
    const auth = Plan.set.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
      proofs: await createAuthorization({ agent, service, account }),
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('can delegate plan/set', async function () {
    const invocation = Plan.set.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
      proofs: [
        await Plan.set.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/set')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('can invoke plan/set with the product that its delegation specifies', async function () {
    const invocation = Plan.set.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
      proofs: [
        await Plan.set.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            product: 'did:web:lite.web3.storage',
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/set')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('cannot invoke plan/set with a different product than its delegation specifies', async function () {
    const invocation = Plan.set.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        product: 'did:web:lite.web3.storage',
      },
      proofs: [
        await Plan.set.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            product: 'did:web:starter.web3.storage',
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.set,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    assert.equal(result.error?.message.includes('not authorized'), true)
  })
})

describe('plan/create-admin-session', function () {
  const agent = alice
  const account = 'did:mailto:mallory.com:mallory'
  it('can invoke as an account', async function () {
    const auth = Plan.createAdminSession.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/return'
      },
      proofs: await createAuthorization({ agent, service, account }),
    })
    const result = await access(await auth.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/create-admin-session')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const auth = Plan.createAdminSession.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/return'
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('fails when invoked by a different agent', async function () {
    const auth = Plan.createAdminSession.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/return'
      },
      proofs: await createAuthorization({ agent, service, account }),
    })

    const result = await access(await auth.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('can delegate plan/create-admin-session', async function () {
    const invocation = Plan.createAdminSession.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/return'
      },
      proofs: [
        await Plan.createAdminSession.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            returnURL: 'http://example.com/return'
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/create-admin-session')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('can invoke plan/create-admin-session with the return URL that its delegation specifies', async function () {
    const invocation = Plan.createAdminSession.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/return',
      },
      proofs: [
        await Plan.createAdminSession.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            returnURL: 'http://example.com/return',
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail(`error in self issue: ${result.error.message}`)
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'plan/create-admin-session')
      assert.deepEqual(result.ok.capability.with, account)
    }
  })

  it('cannot invoke plan/create-admin-session with a different product than its delegation specifies', async function () {
    const invocation = Plan.createAdminSession.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        returnURL: 'http://example.com/bad-return',
      },
      proofs: [
        await Plan.createAdminSession.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            returnURL: 'http://example.com/return',
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })
    const result = await access(await invocation.delegate(), {
      capability: Plan.createAdminSession,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    assert.equal(result.error?.message.includes('not authorized'), true)
  })
})
