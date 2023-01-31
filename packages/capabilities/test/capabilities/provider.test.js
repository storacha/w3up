import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Provider from '../../src/provider.js'
import * as Access from '../../src/access.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import { parseLink } from '@ucanto/core'

describe('provider capabilities', function () {
  describe('provider/get', function () {
    it('should self issue', async function () {
      const account = mallory
      const space = bob
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        })
      }
    })

    it('should support consumer did:*', async function () {
      const account = mallory
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: 'did:*',
        },
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: 'did:*',
        })
      }
    })

    it('should invoke from provider/*', async function () {
      const account = mallory
      const space = bob
      const agent = alice
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: agent.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Provider.provider.delegate({
            issuer: agent,
            audience: account,
            with: agent.did(),
          }),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        })
      }
    })

    it('should invoke from *', async function () {
      const account = mallory
      const space = bob
      const agent = alice
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: agent.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Provider.top.delegate({
            issuer: agent,
            audience: account,
            with: agent.did(),
          }),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        })
      }
    })

    it('should invoke from session', async function () {
      const agent = alice
      const space = bob
      const account = agent.withDID('did:mailto:alice@mail.com')
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Access.session
            .invoke({
              issuer: service,
              audience: account,
              with: service.did(),
              nb: {
                key: agent.did(),
              },
            })
            .delegate(),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        })
      }
    })

    it('should fail using account issuer without session', async function () {
      const agent = alice
      const space = bob
      const account = agent.withDID('did:mailto:alice@mail.com')
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.ok(
          result.message.includes(`Unable to resolve '${account.did()}' key`)
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail session key does not match invocation signature', async function () {
      const agent = alice
      const space = bob
      const account = agent.withDID('did:mailto:alice@mail.com')
      const proof = await Access.session
        .invoke({
          issuer: service,
          audience: account,
          with: service.did(),
          nb: {
            key: mallory.did(),
          },
        })
        .delegate()

      const invocation = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: account.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [proof],
      })

      const delegation = await invocation.delegate()
      const result = await access(delegation, {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })

      if (result.error) {
        assert.ok(
          result.message.includes(
            `Proof ${delegation.cid.toString()} issued by ${account.did()} does not has a valid signature from ${mallory.did()}`
          )
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should invoke from provider/get', async function () {
      const account = mallory
      const space = bob
      const agent = alice
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: agent.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Provider.get.delegate({
            issuer: agent,
            audience: account,
            with: agent.did(),
          }),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('error in self issue')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'provider/get')
        assert.deepEqual(result.capability.nb, {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        })
      }
    })

    it('should fail if nb does not match', async function () {
      const account = mallory
      const space = bob
      const agent = alice
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: agent.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Provider.get.delegate({
            issuer: agent,
            audience: account,
            with: agent.did(),
            nb: {
              provider: 'did:web:ucan.web3.storage:providers:FREE',
            },
          }),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(
            `did:web:ucan.web3.storage:providers:free violates imposed provider constraint did:web:ucan.web3.storage:providers:FREE`
          )
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail if with does not match', async function () {
      const account = mallory
      const space = bob
      const agent = alice
      const auth = Provider.get.invoke({
        issuer: account,
        audience: service,
        with: agent.did(),
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
          consumer: space.did(),
        },
        proofs: [
          await Provider.get.delegate({
            issuer: agent,
            audience: account,
            with: mallory.did(),
          }),
        ],
      })

      const result = await access(await auth.delegate(), {
        capability: Provider.get,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(
            `Can not derive provider/get with ${agent.did()} from ${mallory.did()}`
          )
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail validation if provider its not did', async function () {
      assert.throws(() => {
        Provider.get.invoke({
          issuer: bob,
          audience: service,
          with: bob.did(),
          nb: {
            // @ts-expect-error
            provider: 'random',
          },
        })
      }, /Error: Invalid 'nb.provider' - Expected a did: but got "random" instead/)
    })
  })

  describe('provider/consume', function () {
    it('should not self issue', async function () {
      const space = bob
      const provider = mallory.withDID(
        'did:web:ucan.web3.storage:providers:free'
      )
      const invocation = Provider.consume.invoke({
        issuer: mallory,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
      })

      const result = await access(await invocation.delegate(), {
        capability: Provider.consume,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(`Capability can not be (self) issued`)
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail different nb.request', async function () {
      const space = bob
      const provider = mallory.withDID(
        'did:web:ucan.web3.storage:providers:free'
      )
      const invocation = Provider.consume.invoke({
        issuer: mallory,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
        proofs: [
          await Provider.consume.delegate({
            issuer: provider,
            audience: mallory,
            with: provider.did(),
          }),
        ],
      })

      const result = await access(await invocation.delegate(), {
        capability: Provider.consume,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(`Capability can not be (self) issued`)
        )
      } else {
        assert.fail('should return error')
      }
    })
  })
})
