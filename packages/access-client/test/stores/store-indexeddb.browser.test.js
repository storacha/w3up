import assert from 'assert'
import { top } from '@web3-storage/capabilities/top'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import * as RSASigner from '@ucanto/principal/rsa'
import { AgentData } from '../../src/agent-data.js'
import { StoreIndexedDB } from '../../src/stores/store-indexeddb.js'

describe('IndexedDB store', () => {
  it('should create and load data', async () => {
    const data = await AgentData.create({
      principal: await RSASigner.generate({ extractable: false }),
    })

    const store = new StoreIndexedDB('test-access-db-' + Date.now())
    await store.open()
    await store.save(data.export())

    const exportData = await store.load()
    assert(exportData)

    // principal private key is not extractable
    const archive = exportData.principal
    assert(!(archive instanceof Uint8Array))
    // eslint-disable-next-line no-unused-vars
    const [[_, key], ...keys] = [...Object.entries(archive.keys)]
    assert.deepEqual(keys, [])
    assert(key instanceof CryptoKey)
    assert.equal(key.extractable, false)

    // no accounts or delegations yet
    assert.equal(exportData.spaces.size, 0)
    assert.equal(exportData.delegations.size, 0)

    // default meta
    assert.equal(exportData.meta.name, 'agent')
    assert.equal(exportData.meta.type, 'device')
  })

  it('should allow custom store name', async () => {
    const store = new StoreIndexedDB('test-access-db-' + Date.now(), {
      dbStoreName: `store-${Date.now()}`,
    })
    await store.open()

    const data0 = await AgentData.create()
    await store.save(data0.export())

    await store.close()
    await store.open()

    const exportedData = await store.load()
    assert(exportedData)

    const data1 = AgentData.fromExport(exportedData)
    assert.equal(data1.principal.did(), data0.principal.did())
  })

  it('should close and disallow usage', async () => {
    const store = new StoreIndexedDB('test-access-db-' + Date.now(), {
      autoOpen: false,
    })
    await store.open()
    await store.load()
    await store.close()

    // should fail
    // @ts-expect-error object is not agent data export
    await assert.rejects(store.save({}), { message: 'Store is not open' })
    await assert.rejects(store.close(), { message: 'Store is not open' })
  })

  it('should round trip delegations', async () => {
    const store = new StoreIndexedDB('test-access-db-' + Date.now())
    await store.open()

    const data0 = await AgentData.create()
    const signer = await EdSigner.generate()
    const del0 = await top.delegate({
      issuer: signer,
      audience: data0.principal,
      with: signer.did(),
      expiration: Infinity,
    })

    data0.addDelegation(del0, { audience: { name: 'test', type: 'device' } })
    await store.save(data0.export())

    const exportData1 = await store.load()
    assert(exportData1)

    const data1 = AgentData.fromExport(exportData1)

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
