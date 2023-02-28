import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Provider from '../../src/provider.js'
import { bob, service, mallory } from '../helpers/fixtures.js'

describe('provider/add', function () {
  it('should self issue', async function () {
    const account = mallory
    const space = bob
    const auth = Provider.add.invoke({
      issuer: account,
      audience: service,
      with: account.did(),
      nb: {
        provider: 'did:web:ucan.web3.storage:providers:free',
        consumer: space.did(),
      },
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
        provider: 'did:web:ucan.web3.storage:providers:free',
        consumer: space.did(),
      })
    }
  })

  it('should not support undefined consumer', async function () {
    assert.throws(() => {
      Provider.add.invoke({
        issuer: bob,
        audience: service,
        with: bob.did(),
        // @ts-expect-error
        nb: {
          provider: 'did:web:ucan.web3.storage:providers:free',
        },
      })
    }, /Error: Invalid 'nb.consumer' - Expected URI but got undefined/)
  })
})
