import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Access from '../../src/access.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import * as Ucanto from '@ucanto/interface'
import { delegate, invoke, parseLink } from '@ucanto/core'

describe('access capabilities', function () {
  describe('access/authorize', function () {
    it('should self issue', async function () {
      const agent = mallory
      const auth = Access.authorize.invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.authorize.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
            nb: {
              iss: 'did:mailto:web3.storage:test',
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
        })
      }
    })

    it('should error auth to auth when `iss` is different', async function () {
      const agent1 = bob
      const agent2 = mallory
      const claim = Access.authorize.invoke({
        issuer: agent2,
        audience: service,
        with: agent1.did(),
        nb: {
          iss: 'did:mailto:web3.storage:ANOTHER_TEST',
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.authorize.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
            nb: {
              iss: 'did:mailto:web3.storage:test',
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

    it('should be able to derive from * scope', async function () {
      const claim = Access.authorize.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          att: [{ can: 'store/*' }],
        },
        proofs: [
          await Access.authorize.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: '*' }],
            },
          }),
        ],
      })

      const result = await access(await claim.delegate(), {
        capability: Access.authorize,
        principal: Verifier,
        authority: service,
      })

      assert.equal(result.error, undefined, 'should be authorized')
    })

    it('should be able to reduce scope', async function () {
      const claim = Access.authorize.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          att: [{ can: 'store/add' }],
        },
        proofs: [
          await Access.authorize.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: 'store/add' }, { can: 'store/remove' }],
            },
          }),
        ],
      })

      const result = await access(await claim.delegate(), {
        capability: Access.authorize,
        principal: Verifier,
        authority: service,
      })

      assert.equal(result.error, undefined, 'should be authorized')
    })

    it('should error on escalation', async function () {
      const claim = Access.authorize.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.authorize.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: 'store/*' }],
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
        assert.ok(result.message.includes('unauthorized nb.att.can *'))
      } else {
        assert.fail('should error')
      }
    })

    it('should error on principal misalignment', async function () {
      const agent1 = bob
      const agent2 = mallory
      const claim = Access.authorize.invoke({
        issuer: agent2,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          att: [{ can: '*' }],
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
            iss: 'did:NOT_MAILTO:web3.storage:test',
            att: [{ can: '*' }],
          },
        })
      }, /Expected a did:mailto: but got "did:NOT_MAILTO:web3.storage:test" instead/)
    })
  })

  describe('access/confirm', function () {
    it('should self issue', async function () {
      const agent = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          aud: agent.did(),
          att: [{ can: '*' }],
        },
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'access/confirm')
        assert.deepEqual(result.capability.nb, {
          iss: 'did:mailto:web3.storage:test',
          aud: agent.did(),
          att: [{ can: '*' }],
        })
      }
    })

    it('should delegate from confirm to confirm', async function () {
      const agent1 = bob
      const agent2 = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent2,
        audience: service,
        with: agent1.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.confirm.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
            nb: {
              iss: 'did:mailto:web3.storage:test',
            },
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail('should not error')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'access/confirm')
        assert.deepEqual(result.capability.nb, {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        })
      }
    })

    it('should delegate from access/* to access/confirm', async function () {
      const agent1 = bob
      const agent2 = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent2,
        audience: service,
        with: agent1.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.access.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail('should not error')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'access/confirm')
        assert.deepEqual(result.capability.nb, {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        })
      }
    })

    it('should delegate from * to access/confirm', async function () {
      const agent1 = bob
      const agent2 = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent2,
        audience: service,
        with: agent1.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.top.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.fail('should not error')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'access/confirm')
        assert.deepEqual(result.capability.nb, {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        })
      }
    })

    it('should error when `iss` is different', async function () {
      const agent1 = bob
      const agent2 = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent2,
        audience: service,
        with: agent1.did(),
        nb: {
          iss: 'did:mailto:web3.storage:ANOTHER_TEST',
          aud: agent2.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.confirm.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
            nb: {
              iss: 'did:mailto:web3.storage:test',
            },
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.ok(result.message.includes('- Can not derive'))
      } else {
        assert.fail('should error')
      }
    })

    it('should be able to derive from * scope', async function () {
      const ucan = Access.confirm.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          aud: bob.did(),
          att: [{ can: 'store/*' }],
        },
        proofs: [
          await Access.confirm.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: '*' }],
            },
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      assert.equal(result.error, undefined, 'should be authorized')
    })

    it('should be able to reduce scope', async function () {
      const ucan = Access.confirm.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          aud: bob.did(),
          att: [{ can: 'store/add' }],
        },
        proofs: [
          await Access.confirm.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: 'store/add' }, { can: 'store/remove' }],
            },
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      assert.equal(result.error, undefined, 'should be authorized')
    })

    it('should error on escalation', async function () {
      const ucan = Access.confirm.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web.mail:alice',
          aud: bob.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.confirm.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
            nb: {
              iss: 'did:mailto:web.mail:alice',
              att: [{ can: 'store/*' }],
            },
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.ok(result.message.includes('unauthorized nb.att.can *'))
      } else {
        assert.fail('should error')
      }
    })

    it('should error on principal misalignment', async function () {
      const agent1 = bob
      const agent2 = mallory
      const ucan = Access.confirm.invoke({
        issuer: agent2,
        audience: service,
        with: alice.did(),
        nb: {
          iss: 'did:mailto:web3.storage:test',
          aud: agent2.did(),
          att: [{ can: '*' }],
        },
        proofs: [
          await Access.top.delegate({
            issuer: agent1,
            audience: agent2,
            with: agent1.did(),
          }),
        ],
      })

      const result = await access(await ucan.delegate(), {
        capability: Access.confirm,
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
        Access.confirm.invoke({
          issuer: bob,
          audience: service,
          with: bob.did(),
          nb: {
            // @ts-expect-error
            iss: 'did:NOT_MAILTO:web3.storage:test',
            aud: bob.did(),
            att: [{ can: '*' }],
          },
        })
      }, /Expected a did:mailto: but got "did:NOT_MAILTO:web3.storage:test" instead/)
    })
  })

  describe('access/claim', () => {
    // ensure we can use the capability to produce the invocations from the spec at https://github.com/web3-storage/specs/blob/576b988fb7cfa60049611963179277c420605842/w3-access.md
    it('can create/access delegations from spec', async () => {
      const audience = service.withDID('did:web:web3.storage')

      const examples = [
        // https://github.com/web3-storage/specs/blob/576b988fb7cfa60049611963179277c420605842/w3-access.md#accessclaim
        /**
         *
         * @param {{ issuer: Ucanto.Signer<Ucanto.DID<'key'>>}} input
         */
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
  it('authorizes self issued invocation', async () => {
    const invocation = await Access.delegate
      .invoke({
        issuer: alice,
        audience: service,
        with: alice.did(),
        nb: {
          delegations: {},
        },
      })
      .delegate()
    const accessResult = await access(invocation, {
      capability: Access.delegate,
      principal: Verifier,
      authority: service,
    })
    assert.ok(
      accessResult.error !== true,
      'result of access(invocation) is not an error'
    )
  })

  /**
   * Assert can parse various valid ways of expressing '.nb.delegations` delegations as a dict.
   * The property names SHOULD be CIDs of the value links, but this invariant is not enforced.
   */
  for (const [variantName, { entry }] of Object.entries(
    nbDelegationsEntryVariants(
      delegate({
        issuer: alice,
        audience: bob,
        capabilities: [{ can: '*', with: alice.did() }],
      })
    )
  )) {
    it(`authorizes .nb.delegations dict key variant ${variantName}`, async () => {
      const invocation = await Access.delegate
        .invoke({
          issuer: alice,
          audience: service,
          with: alice.did(),
          nb: {
            delegations: Object.fromEntries([await entry]),
          },
        })
        .delegate()
      const accessResult = await access(invocation, {
        capability: Access.delegate,
        principal: Verifier,
        authority: service,
      })
      assert.ok(
        accessResult.error !== true,
        'result of access(invocation) is not an error'
      )
    })
  }

  /**
   * Assert can derive access/delegate from these UCAN proof.can
   */
  const expectCanDeriveDelegateFromCans = /** @type {const} */ ([
    '*',
    'access/*',
    'access/delegate',
  ])
  for (const deriveFromCan of expectCanDeriveDelegateFromCans) {
    it(`derives from can=${deriveFromCan} and matching cap.with`, async () => {
      const invocation = await Access.delegate
        .invoke({
          issuer: bob,
          audience: service,
          with: alice.did(),
          nb: {
            delegations: {},
          },
          proofs: [
            await delegate({
              issuer: alice,
              audience: bob,
              capabilities: [
                {
                  can: deriveFromCan,
                  with: alice.did(),
                },
              ],
            }),
          ],
        })
        .delegate()
      const accessResult = await access(invocation, {
        capability: Access.delegate,
        principal: Verifier,
        authority: service,
      })
      assert.ok(
        accessResult.error !== true,
        'result of access(invocation) is not an error'
      )
    })
  }

  it('cannot delegate a superset of nb.delegations', async () => {
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
    const allDelegations = await createTestDelegations(2)
    const [firstDelegation, ...someDelegations] = allDelegations
    const bobCanDelegateSomeWithAlice = await Access.delegate.delegate({
      issuer: alice,
      audience: bob,
      with: alice.did(),
      nb: {
        // note: only 'some'
        delegations: toDelegationsDict(someDelegations),
      },
    })
    const invocation = await Access.delegate
      .invoke({
        issuer: bob,
        audience,
        with: alice.did(),
        nb: {
          // note: 'all' (more than 'some') - this isn't allowed by the proof
          delegations: toDelegationsDict(allDelegations),
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
    assert.deepEqual(result.failedProofs.length, 1)
    assert.ok(
      result.message.match(`unauthorized nb.delegations ${firstDelegation.cid}`)
    )
  })

  it('cannot invoke if proof.with does not match', async () => {
    const invocation = await Access.delegate
      .invoke({
        issuer: bob,
        audience: service,
        // with mallory, but proof is with alice
        with: mallory.did(),
        nb: {
          delegations: {},
        },
        proofs: [
          await Access.delegate.delegate({
            issuer: alice,
            audience: bob,
            // with alice, but invocation is with mallory
            with: alice.did(),
          }),
        ],
      })
      .delegate()
    const result = await access(invocation, {
      capability: Access.delegate,
      principal: Verifier,
      authority: service,
    })
    assert.ok(result.error, 'result is error')
    assert.ok(
      result.message.includes(
        `Can not derive access/delegate with ${mallory.did()} from ${alice.did()}`
      )
    )
  })

  it('does not parse malformed delegations', async () => {
    const invalidAccessDelegateCapabilities = /** @type {const} */ ([
      {
        can: 'access/delegate',
        with: alice.did(),
        // schema requires nb.delegations
      },
      {
        can: 'access/delegate',
        with: alice.did(),
        // schema requires nb.delegations
        nb: {},
      },
      {
        can: 'access/delegate',
        with: alice.did(),
        nb: {
          delegations: {
            // schema requires value to be a Link, not number
            foo: 1,
          },
        },
      },
      {
        can: 'access/delegate',
        // with must be a did:key
        with: 'https://dag.house',
      },
      {
        can: 'access/delegate',
        // with must be a did:key
        with: 'did:web:dag.house',
      },
    ])
    for (const cap of invalidAccessDelegateCapabilities) {
      const accessResult = await access(
        // @ts-ignore - tsc doesn't like the invalid capability types,
        // but we want to ensure there is a runtime error too
        await delegate({
          issuer: alice,
          audience: bob,
          capabilities: [cap],
        }),
        {
          capability: Access.delegate,
          principal: Verifier,
          authority: service,
        }
      )
      assert.ok(accessResult.error, 'accessResult is error')
      assert.ok(
        accessResult.message.includes(
          `Encountered malformed 'access/delegate' capability`
        )
      )
    }
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

/**
 * Create named variants of ways that .nb.delegations dict could represent a delegation entry in its dict
 *
 * @template {Ucanto.Capabilities} Caps
 * @param {Promise<Ucanto.Delegation<Caps>>} delegation
 */
function nbDelegationsEntryVariants(delegation) {
  return {
    'correct cid': {
      entry: delegation.then((delegation) => [
        delegation.cid.toString(),
        delegation.cid,
      ]),
    },
    'property not a cid': {
      entry: delegation.then((delegation) => ['thisIsNotACid', delegation.cid]),
    },
    'property name is a cid but does not correspond to value': {
      entry: delegation.then((delegation) => [
        parseLink('bafkqaaa').toString(),
        delegation.cid,
      ]),
    },
  }
}
