import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Access from '../../src/access.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import * as Ucanto from '@ucanto/interface'
import { delegate, invoke, parseLink } from '@ucanto/core'

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
    it('can create/access delegations from spec', async () => {
      const audience = service.withDID('did:web:web3.storage')
      /**
       * @type {Array<(arg: { issuer: Ucanto.Signer<Ucanto.DID<'key'>>}) => Ucanto.IssuedInvocation<Ucanto.InferInvokedCapability<typeof Access.claim>>>}
       */
      const examples = [
        // https://github.com/web3-storage/specs/blob/576b988fb7cfa60049611963179277c420605842/w3-access.md#accessclaim
        ({ issuer }) => {
          return Access.claim.invoke({
            issuer,
            audience,
            with: issuer.did(),
          })
        },
      ]
      for (const example of examples) {
        const invocation = await example({ issuer: bob }).delegate()
        const result = await access(invocation, {
          capability: Access.claim,
          principal: Verifier,
          authority: audience,
        })
        assert.ok(
          result.error !== true,
          'result of access(invocation) is not an error'
        )
        assert.deepEqual(
          result.audience.did(),
          audience.did(),
          'result audience did is expected value'
        )
        assert.equal(
          result.capability.can,
          'access/claim',
          'result capability.can is access/claim'
        )
        assert.deepEqual(result.capability.nb, {}, 'result has empty nb')
      }
    })
    it('can be derived', async () => {
      /** @type {Array<Ucanto.Ability>} */
      const cansThatShouldDeriveAccessClaim = ['*', 'access/*']
      for (const can of cansThatShouldDeriveAccessClaim) {
        const invocation = await invoke({
          issuer: alice,
          audience: service,
          capability: {
            can: 'access/claim',
            with: bob.did(),
          },
          proofs: [
            await delegate({
              issuer: bob,
              audience: alice,
              capabilities: [
                {
                  can,
                  with: bob.did(),
                },
              ],
            }),
          ],
        }).delegate()
        const result = await access(invocation, {
          capability: Access.claim,
          principal: Verifier,
          authority: service,
        })
        assert.ok(
          result.error !== true,
          'result of access(invocation) is not an error'
        )
      }
    })
    it('cannot invoke when .with uses unexpected did method', async () => {
      const issuer = bob.withDID('did:foo:bar')
      assert.throws(
        () =>
          Access.claim.invoke({
            issuer,
            audience: service,
            // @ts-ignore - expected complaint from compiler. We want to make sure there is an equivalent error at runtime
            with: issuer.did(),
          }),
        `Invalid 'with'`
      )
    })
    it('does not authorize invocations whose .with uses unexpected did methods', async () => {
      const issuer = bob
      const audience = service
      const invocation = await delegate({
        issuer,
        audience,
        capabilities: [
          {
            can: 'access/claim',
            with: issuer.withDID('did:foo:bar').did(),
          },
        ],
      })
      const result = await access(
        // @ts-ignore - expected complaint from compiler. We want to make sure there is an equivalent error at runtime
        invocation,
        {
          capability: Access.claim,
          principal: Verifier,
          authority: audience,
        }
      )
      assert.ok(result.error, 'result of access(invocation) is an error')
      assert.deepEqual(result.name, 'Unauthorized')
      assert.ok(
        result.delegationErrors.find((e) =>
          e.message.includes('but got "did:foo:bar" instead')
        ),
        'a result.delegationErrors message mentions invalid with value'
      )
    })
    it('does not authorize invocations whose .with is not an issuer in proofs', async () => {
      const issuer = bob
      const audience = service
      const invocation = await Access.claim
        .invoke({
          issuer,
          audience,
          // note: this did is not same as issuer.did() so issuer has no proof that they can use this resource
          with: alice.did(),
        })
        .delegate()
      const result = await access(invocation, {
        capability: Access.claim,
        principal: Verifier,
        authority: audience,
      })
      assert.ok(result.error, 'result of access(invocation) is an error')
      assert.deepEqual(result.name, 'Unauthorized')
      assert.ok(
        result.failedProofs.find((e) => {
          return /Capability (.+) is not authorized/.test(e.message)
        })
      )
    })
  })
})

describe('access/delegate', () => {
  it('can create valid delegations and authorize them', async () => {
    const issuer = alice
    const audience = service.withDID('did:web:web3.storage')
    const bobCanStoreAllWithAlice = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'store/*', with: alice.did() }],
    })
    // @todo - add example of delegating alice -> bob
    const examples = [
      // uncommon to have empty delegation set, but it is valid afaict
      Access.delegate
        .invoke({
          issuer,
          audience,
          with: issuer.did(),
          nb: {
            delegations: {},
          },
        })
        .delegate(),
      // https://github.com/web3-storage/specs/blob/7e662a2d9ada4e3fc22a7a68f84871bff0a5380c/w3-access.md?plain=1#L58
      // with several different, but all valid, property names to use in the `nb.delegations` dict
      .../** @type {const} */ ([
        // correct cid
        [bobCanStoreAllWithAlice.cid.toString(), bobCanStoreAllWithAlice.cid],
        // not a cid at all
        ['thisIsNotACid', bobCanStoreAllWithAlice.cid],
        // cid that does not correspond to value
        [parseLink('bafkqaaa').toString(), bobCanStoreAllWithAlice.cid],
      ]).map(([delegationDictKey, delegationLink]) =>
        Access.delegate
          .invoke({
            issuer,
            audience,
            with: issuer.did(),
            nb: {
              delegations: {
                [delegationDictKey]: delegationLink,
              },
            },
            proofs: [bobCanStoreAllWithAlice],
          })
          .delegate()
      ),
    ]
    for (const example of examples) {
      const invocation = await example
      const result = await access(invocation, {
        capability: Access.delegate,
        principal: Verifier,
        authority: audience,
      })
      assert.ok(
        result.error !== true,
        'result of access(invocation) is not an error'
      )
      assert.deepEqual(
        result.audience.did(),
        audience.did(),
        'result audience did is expected value'
      )
      assert.equal(
        result.capability.can,
        'access/delegate',
        'result capability.can is access/delegate'
      )
      assert.deepEqual(
        result.capability.nb,
        invocation.capabilities[0].nb,
        'result has expected nb'
      )
    }
  })
  // @todo test can derive from access/* to access/delegate
  it('can only delegate a subset of nb.delegations', async () => {
    const audience = service
    /** @param {string} methodName */
    const createTestDelegation = (methodName) =>
      delegate({
        issuer: alice,
        audience: bob,
        capabilities: [{ can: `test/${methodName}`, with: alice.did() }],
      })
    /** @param {number} length */
    const createTestDelegations = (length) =>
      Promise.all(
        Array.from({ length }).map((_, i) => createTestDelegation(i.toString()))
      )
    const allTestDelegations = await createTestDelegations(2)
    const [, ...someTestDelegations] = allTestDelegations
    const bobCanDelegateSomeWithAlice = await Access.delegate.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
      nb: {
        delegations: toDelegationsDict(someTestDelegations),
      },
    })
    const invocation = await Access.delegate
      .invoke({
        issuer: bob,
        audience,
        with: alice.did(),
        nb: {
          delegations: toDelegationsDict(allTestDelegations),
        },
        proofs: [bobCanDelegateSomeWithAlice],
      })
      .delegate()
    const result = await access(invocation, {
      capability: Access.delegate,
      principal: Verifier,
      authority: audience,
    })
    assert.ok(result.error === true, 'result of access(invocation) is an error')
  })
})

/**
 * Given array of delegations, return a valid value for access/delegate nb.delegations
 *
 * @param {Array<Ucanto.Delegation>} delegations
 */
function toDelegationsDict(delegations) {
  return Object.fromEntries(delegations.map((d) => [d.cid.toString(), d.cid]))
}
