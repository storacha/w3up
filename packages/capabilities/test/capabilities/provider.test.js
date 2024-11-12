import assert from 'assert'
import { access } from '@ucanto/validator'
import * as principal from '@ucanto/principal'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Provider from '../../src/provider.js'
import { bob, service, alice, mallory } from '../helpers/fixtures.js'
import { createAuthorization, validateAuthorization } from '../helpers/utils.js'
import * as ucanto from '@ucanto/core'
import * as Ucanto from '@ucanto/interface'

describe('provider/add', function () {
  it('can invoke as an account', async function () {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = bob
    const auth = Provider.add.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: await createAuthorization({ agent, service, account }),
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.ok.audience.did(), service.did())
      assert.equal(result.ok.capability.can, 'provider/add')
      assert.deepEqual(result.ok.capability.nb, {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      })
    }
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = bob
    const auth = Provider.add.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('fails without attestation', async function () {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = bob
    const [delegation] = await createAuthorization({
      agent,
      service,
      account,
    })
    const auth = Provider.add.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: [delegation],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('fails without account delegation', async function () {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = bob
    const [, attestation] = await createAuthorization({
      agent,
      service,
      account,
    })
    const auth = Provider.add.invoke({
      issuer: agent,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: [attestation],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('not authorized'), true)
  })

  it('requires nb.consumer', async function () {
    const bobAccount = bob.withDID('did:mailto:bob.com:bob')
    assert.throws(() => {
      Provider.add.invoke({
        issuer: bob,
        audience: service,
        with: bobAccount.did(),
        // @ts-ignore
        nb: {
          provider: 'did:web:test.upload.storacha.network',
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "consumer"/)
  })

  it('nb.consumer must be a did:key', async function () {
    const bobAccount = bob.withDID('did:mailto:bob.com:bob')
    assert.throws(() => {
      Provider.add.invoke({
        issuer: bob,
        audience: service,
        with: bobAccount.did(),
        nb: {
          provider: 'did:web:test.upload.storacha.network',
          // @ts-expect-error
          consumer: 'did:mailto:storacha.network:user',
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "consumer"/)
  })

  it('requires nb.provider', async function () {
    const bobAccount = bob.withDID('did:mailto:bob.com:bob')
    assert.throws(() => {
      Provider.add.invoke({
        issuer: bob,
        audience: service,
        with: bobAccount.did(),
        // @ts-expect-error - missing provider
        nb: {
          // provider: 'did:web:test.upload.storacha.network',
          consumer: bob.did(),
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "provider"/)
  })

  it('does not require nb.provider be registered', async function () {
    const bobAccount = bob.withDID('did:mailto:bob.com:bob')
    await Provider.add
      .invoke({
        issuer: bob,
        audience: service,
        with: bobAccount.did(),
        nb: {
          provider: 'did:web:storacha.network:providers:w3up-beta',
          consumer: bob.did(),
        },
      })
      .delegate()
  })

  it('can delegate provider/add', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: [
        await Provider.add.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            provider: 'did:web:test.upload.storacha.network',
            consumer: space.did(),
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error, undefined)
  })

  it('can delegate provider/add without setting consumer', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: [
        await Provider.add.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            provider: 'did:web:test.upload.storacha.network',
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error, undefined)
  })

  it('can delegate provider/add without setting provider', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: space.did(),
      },
      proofs: [
        await Provider.add.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            consumer: space.did(),
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error, undefined)
  })

  it('can not change delegated consumer', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: bob.did(),
      },
      proofs: [
        await Provider.add.delegate({
          issuer: agent,
          audience: bob,
          with: account,
          nb: {
            consumer: space.did(),
          },
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.equal(result.error?.message.includes('Constrain violation'), true)
  })

  it('can not change delegated provider', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: account,
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: bob.did(),
      },
      proofs: [
        await ucanto.delegate({
          issuer: agent,
          audience: bob,
          capabilities: [
            {
              with: account,
              can: 'provider/add',
              nb: {
                provider: 'did:web:storacha.network:providers:w3up-beta',
                consumer: space.did(),
              },
            },
          ],
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.ok(result.error)
  })

  it('can not change with field', async () => {
    const agent = alice
    const account = 'did:mailto:mallory.com:mallory'
    const space = mallory
    const auth = Provider.add.invoke({
      issuer: bob,
      audience: service,
      with: 'did:mailto:mallory.com:bob',
      nb: {
        provider: 'did:web:test.upload.storacha.network',
        consumer: bob.did(),
      },
      proofs: [
        await ucanto.delegate({
          issuer: agent,
          audience: bob,
          capabilities: [
            {
              with: account,
              can: 'provider/add',
              nb: {
                provider: 'did:web:storacha.network:providers:w3up-beta',
                consumer: space.did(),
              },
            },
          ],
          proofs: await createAuthorization({ agent, service, account }),
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
      validateAuthorization,
    })

    assert.ok(result.error)
  })

  for (const useAccountDid of [true, false]) {
    it(`cannot provider/add with no proofs useAccountDid=${useAccountDid}`, async () => {
      const agentA = await principal.ed25519.generate()
      const accountDID = /** @type {Ucanto.DID<'mailto'>} */ (
        'did:mailto:example.com:foo'
      )
      const account = { did: () => accountDID }
      const space = await principal.ed25519.generate()
      const service = await principal.ed25519.generate()
      const issuer = useAccountDid ? agentA.withDID(accountDID) : agentA
      const providerAddInvocation = await Provider.add
        .invoke({
          issuer,
          audience: service,
          with: account.did(),
          nb: {
            consumer: space.did(),
            provider: 'did:web:test.upload.storacha.network',
          },
          // NOTE: no proofs!
        })
        .delegate()

      const result = await access(await providerAddInvocation.delegate(), {
        capability: Provider.add,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })
      assert.ok(result.error, 'validator.access result')
    })
  }
})
