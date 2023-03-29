import assert from 'assert'
import { Signer } from '@ucanto/principal/ed25519'
import { EdDSA } from '@ipld/dag-ucan/signature'
import { StoreConf } from '@web3-storage/access/stores/store-conf'
import { create } from '../src/index.node.js'

describe('create', () => {
  it('should create Ed25519 key', async () => {
    const client = await create()
    const signer = client.agent()
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signatureCode, EdDSA)
  })

  it('should load from existing store', async () => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const client0 = await create({ store })
    const client1 = await create({ store })

    assert.equal(client0.agent().did(), client1.agent().did())
  })

  it('should allow BYO principal', async () => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const principal = await Signer.generate()
    const client = await create({ principal, store })

    assert.equal(client.agent().did(), principal.did())
  })

  it('should throw for mismatched BYO principal', async () => {
    const store = new StoreConf({ profile: 'w3up-client-test' })
    await store.reset()

    const principal0 = await Signer.generate()
    await create({ principal: principal0, store })

    const principal1 = await Signer.generate()
    await assert.rejects(create({ principal: principal1, store }), {
      message: `store cannot be used with ${principal1.did()}, stored principal and passed principal must match`,
    })
  })
})
