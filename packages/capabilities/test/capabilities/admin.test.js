import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Admin from '../../src/admin.js'
import { service, alice, readmeCID } from '../helpers/fixtures.js'

describe('admin/upload/inspect', async function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Admin.upload.inspect.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        root: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Admin.upload.inspect,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'admin/upload/inspect')
      assert.deepEqual(result.ok.capability.nb, {
        root: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Admin.upload.inspect.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        root: readmeCID,
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'admin/upload/inspect' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Admin.upload.inspect,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'admin/upload/inspect')
      assert.deepEqual(result.ok.capability.nb, {
        root: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Admin.upload.inspect.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        root: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Admin.upload.inspect,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.root', async function () {
    assert.throws(() => {
      Admin.upload.inspect.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "root"/)
  })
})

describe('admin/store/inspect', function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Admin.store.inspect.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        link: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Admin.store.inspect,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'admin/store/inspect')
      assert.deepEqual(result.ok.capability.nb, {
        link: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Admin.store.inspect.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        link: readmeCID,
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'admin/store/inspect' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Admin.store.inspect,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'admin/store/inspect')
      assert.deepEqual(result.ok.capability.nb, {
        link: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Admin.store.inspect.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        link: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Admin.store.inspect,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.shard', async function () {
    assert.throws(() => {
      Admin.store.inspect.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "link"/)
  })
})
