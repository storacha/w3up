import assert from 'assert'
import { access } from '@ucanto/validator'
import { delegate } from '@ucanto/core'
import { Verifier } from '@ucanto/principal/ed25519'
import * as RateLimit from '../../src/rate-limit.js'
import { bob, service, alice } from '../helpers/fixtures.js'

describe('rate-limit/add', function () {
  const space = bob
  it('can be invoked by the service on the service', async function () {
    const invocation = RateLimit.add.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: {
        subject: space.did(),
        rate: 0,
      },
    })
    const result = await access(await invocation.delegate(), {
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
        subject: space.did(),
        rate: 0,
      })
    }
  })

  it('should fail when changing rate constraint', async function () {
    const subject = 'travis@example.com'
    const delegation = await RateLimit.add.delegate({
      issuer: service,
      audience: bob,
      with: service.did(),
      nb: {
        rate: 0,
      },
    })

    {
      const add = RateLimit.add.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          rate: 0,
          subject,
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: RateLimit.add,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail(result.error.message)
      }

      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/add')
      assert.deepEqual(result.ok.capability.nb, {
        rate: 0,
        subject,
      })
    }

    {
      const add = RateLimit.add.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          rate: 1,
          subject,
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: RateLimit.add,
        principal: Verifier,
        authority: service,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes('1 violates imposed rate constraint 0')
      )
    }
  })

  it('should fail when changing subject constraint', async function () {
    const rate = 0
    const delegation = await RateLimit.add.delegate({
      issuer: service,
      audience: bob,
      with: service.did(),
      nb: {
        subject: 'example.com',
      },
    })

    {
      const add = RateLimit.add.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          rate,
          subject: 'example.com',
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: RateLimit.add,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail(result.error.message)
      }

      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/add')
      assert.deepEqual(result.ok.capability.nb, {
        rate,
        subject: 'example.com',
      })
    }

    {
      const add = RateLimit.add.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          rate: 1,
          subject: 'different.example.com',
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: RateLimit.add,
        principal: Verifier,
        authority: service,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes(
          'different.example.com violates imposed subject constraint example.com'
        )
      )
    }
  })

  it('can be invoked by an agent delegated permissions by the service', async function () {
    const agent = alice

    const auth = RateLimit.add.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        subject: space.did(),
        rate: 0,
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: RateLimit.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail(
        `error in self issue: ${JSON.stringify(result.error.message)}`
      )
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/add')
      assert.deepEqual(result.ok.capability.nb, {
        subject: space.did(),
        rate: 0,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const space = bob
    const auth = RateLimit.add.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
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

  it('requires nb.subject', async function () {
    assert.throws(() => {
      RateLimit.add.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {
          rate: 0,
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "subject"/)
  })

  it('requires nb.rate', async function () {
    assert.throws(() => {
      RateLimit.add.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {
          subject: alice.did(),
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "rate"/)
  })
})

describe('rate-limit/remove', function () {
  const rateLimitId = '123'
  it('can by invoked as account', async function () {
    const agent = alice
    const auth = RateLimit.remove.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        id: rateLimitId,
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'rate-limit/remove' }],
        }),
      ],
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
        id: rateLimitId,
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = RateLimit.remove.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        id: rateLimitId,
      },
    })

    const result = await access(await auth.delegate(), {
      capability: RateLimit.remove,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.id', async function () {
    assert.throws(() => {
      RateLimit.remove.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "id"/)
  })

  it('should fail when changing id constraint', async function () {
    const delegation = await RateLimit.remove.delegate({
      issuer: service,
      audience: bob,
      with: service.did(),
      nb: {
        id: '123',
      },
    })

    {
      const remove = RateLimit.remove.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          id: '123',
        },
        proofs: [delegation],
      })

      const result = await access(await remove.delegate(), {
        capability: RateLimit.remove,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail(result.error.message)
      }

      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/remove')
      assert.deepEqual(result.ok.capability.nb, {
        id: '123',
      })
    }

    {
      const add = RateLimit.remove.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          id: '456',
        },
        proofs: [delegation],
      })

      const result = await access(await add.delegate(), {
        capability: RateLimit.remove,
        principal: Verifier,
        authority: service,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes('456 violates imposed id constraint 123')
      )
    }
  })
})

describe('rate-limit/list', function () {
  const space = bob
  it('can by invoked as account', async function () {
    const agent = alice
    const auth = RateLimit.list.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        subject: space.did(),
      },
      proofs: [
        await delegate({
          issuer: service,
          audience: agent,
          capabilities: [{ with: service.did(), can: 'rate-limit/list' }],
        }),
      ],
    })
    const result = await access(await auth.delegate(), {
      capability: RateLimit.list,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/list')
      assert.deepEqual(result.ok.capability.nb, {
        subject: space.did(),
      })
    }
  })

  it('fails without a delegation from the service delegation', async function () {
    const agent = alice
    const auth = RateLimit.list.invoke({
      issuer: agent,
      audience: service,
      with: service.did(),
      nb: {
        subject: space.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: RateLimit.list,
      principal: Verifier,
      authority: service,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.subject', async function () {
    assert.throws(() => {
      RateLimit.list.invoke({
        issuer: alice,
        audience: service,
        with: service.did(),
        // @ts-ignore
        nb: {},
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "subject"/)
  })

  it('should fail when changing subject constraint', async function () {
    const delegation = await RateLimit.list.delegate({
      issuer: service,
      audience: bob,
      with: service.did(),
      nb: {
        subject: 'travis@example.com',
      },
    })

    {
      const list = RateLimit.list.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          subject: 'travis@example.com',
        },
        proofs: [delegation],
      })

      const result = await access(await list.delegate(), {
        capability: RateLimit.list,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail(result.error.message)
      }

      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'rate-limit/list')
      assert.deepEqual(result.ok.capability.nb, {
        subject: 'travis@example.com',
      })
    }

    {
      const list = RateLimit.list.invoke({
        issuer: bob,
        audience: service,
        with: service.did(),
        nb: {
          subject: 'alice@example.com',
        },
        proofs: [delegation],
      })

      const result = await access(await list.delegate(), {
        capability: RateLimit.list,
        principal: Verifier,
        authority: service,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes(
          'alice@example.com violates imposed subject constraint travis@example.com'
        )
      )
    }
  })
})
