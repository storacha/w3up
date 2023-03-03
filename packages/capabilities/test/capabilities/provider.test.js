import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Provider from '../../src/provider.js'
import { bob, service, mallory } from '../helpers/fixtures.js'
import * as ucanto from '@ucanto/core'

describe('provider/add', function () {
  it.skip('can invoke as account with ./update', async function () {
    const account = mallory.withDID('did:mailto:mallory.com:mallory')
    const space = bob
    const auth = Provider.add.invoke({
      issuer: account,
      audience: service,
      with: account.did(),
      nb: {
        provider: 'did:web:web3.storage:providers:w3up-alpha',
        consumer: space.did(),
      },
      proofs: [
        await ucanto.delegate({
          issuer: service,
          audience: account,
          capabilities: [
            {
              with: service.did(),
              can: './update',
              nb: {
                key: mallory.did(),
              },
            },
          ],
        }),
      ],
    })

    const result = await access(await auth.delegate(), {
      capability: Provider.add,
      principal: Verifier,
      authority: service,
    })
    if (result.error) {
      assert.fail('error in self issue')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'provider/add')
      assert.deepEqual(result.capability.nb, {
        provider: 'did:web:web3.storage:providers:w3up-alpha',
        consumer: space.did(),
      })
    }
  })

  it('should not support undefined consumer', async function () {
    const bobAccount = bob.withDID('did:mailto:bob.com:bob')
    assert.throws(() => {
      Provider.add.invoke({
        issuer: bob,
        audience: service,
        with: bobAccount.did(),
        // @ts-expect-error
        nb: {
          provider: 'did:web:web3.storage:providers:w3up-alpha',
        },
      })
    }, /Error: Invalid 'nb' - Object contains invalid field "consumer"/)
  })
})
