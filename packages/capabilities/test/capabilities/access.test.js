import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Access from '../../src/access.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import * as ucanto from '@ucanto/core'

describe('access capabilities', function () {
  it('should self issue', async function () {
    const agent = mallory
    const auth = Access.authorize.invoke({
      issuer: agent,
      audience: service,
      with: agent.did(),
      nb: {
        as: 'did:mailto:web3.storage:test',
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'access/authorize')
      assert.deepEqual(result.capability.nb, {
        as: 'did:mailto:web3.storage:test',
      })
    }
  })

  it('should delegate from authorize to authorize', async function () {
    const agent1 = bob
    const agent2 = mallory
    const claim = Access.authorize.invoke({
      issuer: agent2,
      audience: service,
      with: agent1.did(),
      nb: {
        as: 'did:mailto:web3.storage:test',
      },
      proofs: [
        await Access.authorize.delegate({
          issuer: agent1,
          audience: agent2,
          with: agent1.did(),
          nb: {
            as: 'did:mailto:web3.storage:test',
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.fail('should not error')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'access/authorize')
      assert.deepEqual(result.capability.nb, {
        as: 'did:mailto:web3.storage:test',
      })
    }
  })

  it('should delegate from authorize/* to authorize', async function () {
    const agent1 = bob
    const agent2 = mallory
    const claim = Access.authorize.invoke({
      issuer: agent2,
      audience: service,
      with: agent1.did(),
      nb: {
        as: 'did:mailto:web3.storage:test',
      },
      proofs: [
        await Access.access.delegate({
          issuer: agent1,
          audience: agent2,
          with: agent1.did(),
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.fail('should not error')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'access/authorize')
      assert.deepEqual(result.capability.nb, {
        as: 'did:mailto:web3.storage:test',
      })
    }
  })
  it('should delegate from * to authorize', async function () {
    const agent1 = bob
    const agent2 = mallory
    const claim = Access.authorize.invoke({
      issuer: agent2,
      audience: service,
      with: agent1.did(),
      nb: {
        as: 'did:mailto:web3.storage:test',
      },
      proofs: [
        await Access.top.delegate({
          issuer: agent1,
          audience: agent2,
          with: agent1.did(),
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.fail('should not error')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'access/authorize')
      assert.deepEqual(result.capability.nb, {
        as: 'did:mailto:web3.storage:test',
      })
    }
  })

  it('should error auth to auth when caveats are different', async function () {
    const agent1 = bob
    const agent2 = mallory
    const claim = Access.authorize.invoke({
      issuer: agent2,
      audience: service,
      with: agent1.did(),
      nb: {
        as: 'did:mailto:web3.storage:ANOTHER_TEST',
      },
      proofs: [
        await Access.authorize.delegate({
          issuer: agent1,
          audience: agent2,
          with: agent1.did(),
          nb: {
            as: 'did:mailto:web3.storage:test',
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.ok(result.message.includes('- Can not derive'))
    } else {
      assert.fail('should error')
    }
  })

  it('should error if with dont match', async function () {
    const agent1 = bob
    const agent2 = mallory
    const claim = Access.authorize.invoke({
      issuer: agent2,
      audience: service,
      with: alice.did(),
      nb: {
        as: 'did:mailto:web3.storage:test',
      },
      proofs: [
        await Access.top.delegate({
          issuer: agent1,
          audience: agent2,
          with: agent1.did(),
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.ok(result.message.includes('- Can not derive'))
    } else {
      assert.fail('should error')
    }
  })

  it('should fail validation if its not mailto', async function () {
    assert.throws(() => {
      Access.authorize.invoke({
        issuer: bob,
        audience: service,
        with: bob.did(),
        nb: {
          // @ts-expect-error
          as: 'did:NOT_MAILTO:web3.storage:test',
        },
      })
    }, /Expected a did:mailto: but got "did:NOT_MAILTO:web3.storage:test" instead/)
  })

  describe('access/claim', () => {
    // ensure we can use the capability to produce the invocations from the spec at https://github.com/web3-storage/specs/blob/576b988fb7cfa60049611963179277c420605842/w3-access.md
    it('can create delegations from spec', async () => {
      /**
       * @type {Array<(arg: { issuer: import('@ucanto/principal').ed25519.Signer.EdSigner }) => void|Promise<void>>}
       */
      const examples = [
        // https://github.com/web3-storage/specs/blob/576b988fb7cfa60049611963179277c420605842/w3-access.md#accessclaim
        ({ issuer }) => {
          Access.claim.invoke({
            issuer,
            audience: ucanto.DID.parse('did:web:web3.storage'),
            with: issuer.did(),
          })
        },
      ]
      for (const example of examples) {
        await example({ issuer: bob })
      }
    })
  })
})
