import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Trace from '../../src/trace.js'
import { service, alice, readmeCID } from '../helpers/fixtures.js'

describe('trace/upload/add', async function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Trace.upload.add.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        root: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Trace.upload.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'trace/upload/add')
      assert.deepEqual(result.ok.capability.nb, {
        root: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Trace.upload.add.invoke({
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
          capabilities: [{ with: service.did(), can: 'trace/upload/add' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Trace.upload.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'trace/upload/add')
      assert.deepEqual(result.ok.capability.nb, {
        root: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Trace.upload.add.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        root: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Trace.upload.add,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.root', async function () {
    assert.throws(() => {
      Trace.upload.add.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "root"/)
  })
})

describe('trace/store/add', function () {
  const agent = alice
  it('can be invoked by the service on the service', async function () {
    const invocation = Trace.store.add.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        link: readmeCID,
      },
    })
    const result = await access(await invocation.delegate(), {
      capability: Trace.store.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'trace/store/add')
      assert.deepEqual(result.ok.capability.nb, {
        link: readmeCID,
      })
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const auth = Trace.store.add.invoke({
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
          capabilities: [{ with: service.did(), can: 'trace/store/add' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: Trace.store.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'trace/store/add')
      assert.deepEqual(result.ok.capability.nb, {
        link: readmeCID,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = Trace.store.add.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        link: readmeCID,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Trace.store.add,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.shard', async function () {
    assert.throws(() => {
      Trace.store.add.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "link"/)
  })
})
