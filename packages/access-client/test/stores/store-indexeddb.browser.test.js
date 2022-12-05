import assert from 'assert'
import { top } from '@web3-storage/capabilities/top'
import { StoreIndexedDB } from '../../src/stores/store-indexeddb.js'
import { Signer } from '@ucanto/principal/ed25519'

describe('IndexedDB store', () => {
  it('should create and load data', async () => {
    const store = await StoreIndexedDB.open('test-access-db-' + Date.now())
    const data = await store.load()
    assert(data)

    // principal private key is not extractable
    const archive = data.principal.toArchive()
    assert(!(archive instanceof Uint8Array))
    assert(archive.key instanceof CryptoKey)
    assert.equal(archive.key.extractable, false)

    // no accounts or delegations yet
    assert.equal(data.spaces.size, 0)
    assert.equal(data.delegations.size, 0)

    // default meta
    assert.equal(data.meta.name, 'agent')
    assert.equal(data.meta.type, 'device')
  })

  it('should allow custom store name', async () => {
    const store = await StoreIndexedDB.open('test-access-db-' + Date.now(), {
      dbStoreName: `store-${Date.now()}`,
    })
    const data = await store.load()
    assert(data)
  })

  it('should check existence', async () => {
    const store = new StoreIndexedDB('test-access-db-' + Date.now())
    await store.open()

    let exists = await store.exists()
    assert.equal(exists, false)

    await store.init({})

    exists = await store.exists()
    assert(exists)
  })

  it('should close and disallow usage', async () => {
    const store = await StoreIndexedDB.open('test-access-db-' + Date.now())
    const data = await store.load()

    await store.close()

    // should all fail
    await assert.rejects(store.init({}), { message: 'Store is not open' })
    await assert.rejects(store.save(data), { message: 'Store is not open' })
    await assert.rejects(store.exists(), { message: 'Store is not open' })
    await assert.rejects(store.close(), { message: 'Store is not open' })
  })

  it('should round trip delegations', async () => {
    const store = await StoreIndexedDB.open('test-access-db-' + Date.now())
    const data0 = await store.load()

    const signer = await Signer.generate()
    const del0 = await top.delegate({
      issuer: signer,
      audience: data0.principal,
      with: signer.did(),
      expiration: Infinity,
    })

    data0.delegations.set(del0.cid.toString(), {
      delegation: del0,
      meta: { audience: { name: 'test', type: 'device' } },
    })
    await store.save(data0)

    const data1 = await store.load()

    const { delegation: del1 } =
      data1.delegations.get(del0.cid.toString()) ?? {}
    assert(del1)
    assert.equal(del1.cid.toString(), del0.cid.toString())
    assert.equal(del1.issuer.did(), del0.issuer.did())
    assert.equal(del1.audience.did(), del0.audience.did())
    assert.equal(del1.capabilities[0].can, del0.capabilities[0].can)
    assert.equal(del1.capabilities[0].with, del0.capabilities[0].with)
  })
})
