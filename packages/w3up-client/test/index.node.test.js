import assert from 'assert'
import { Signer } from '@ucanto/principal/ed25519'
import { EdDSA } from '@ipld/dag-ucan/signature'
import * as W3Up from '@web3-storage/w3up-client'

describe('open', () => {
  it('should create Ed25519 key', async () => {
    const client = await W3Up.open({
      store: W3Up.Store.open({ name: 'w3up-client-test' }),
    })

    const signer = client.agent.signer
    assert.equal(signer.signatureAlgorithm, 'EdDSA')
    assert.equal(signer.signatureCode, EdDSA)
  })

  it('should load from existing store', async () => {
    const store = W3Up.Store.open({ name: 'w3up-client-test' })
    await store.reset()

    const client0 = await W3Up.open({ store })
    const client1 = await W3Up.open({ store })

    assert.equal(client0.agent.did(), client1.agent.did())
  })

  it('should allow BYO principal', async () => {
    const store = W3Up.Store.open({ name: 'w3up-client-test' })
    await store.reset()

    const principal = await Signer.generate()
    const client = await W3Up.open({ as: principal, store })

    assert.equal(client.agent.did(), principal.did())
  })

  it('can override stored principal', async () => {
    const store = W3Up.Store.open({ name: 'w3up-client-test' })
    await store.reset()

    const basic = await W3Up.create({ store })

    const principal = await Signer.generate()
    const advanced = await W3Up.open({ store, as: principal })

    assert.notDeepEqual(basic.agent.did(), advanced.agent.did())
    assert.deepEqual(advanced.agent.did(), principal.did())
  })
})
