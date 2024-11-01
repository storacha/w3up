import * as Test from './test.js'
import { Signer } from '@ucanto/principal/ed25519'
import { EdDSA } from '@ipld/dag-ucan/signature'
import { StoreConf } from '@storacha/access/stores/store-conf'
import { create } from '../src/index.node.js'

/**
 * @type {Test.Suite}
 */
export const testEd25519Key = {
  'should create Ed25519 key': async (assert) => {
    const client = await create()
    const signer = client.agent.issuer
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signatureCode, EdDSA)
  },

  'should load from existing store': async (assert) => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const client0 = await create({ store })
    const client1 = await create({ store })

    assert.equal(client0.agent.did(), client1.agent.did())
  },

  'should allow BYO principal': async (assert) => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const principal = await Signer.generate()
    const client = await create({ principal, store })

    assert.equal(client.agent.did(), principal.did())
  },

  'should throw for mismatched BYO principal': async (assert) => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const principal0 = await Signer.generate()
    await create({ principal: principal0, store })

    const principal1 = await Signer.generate()
    await assert.rejects(create({ principal: principal1, store }), {
      message: `store cannot be used with ${principal1.did()}, stored principal and passed principal must match`,
    })
  },
}

Test.test({ Ed25519: testEd25519Key })
