import assert from 'assert'
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
})
