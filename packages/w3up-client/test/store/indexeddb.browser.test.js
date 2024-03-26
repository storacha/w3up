import assert from 'assert'
import { top } from '@web3-storage/capabilities/top'
import { Signer as EdSigner } from '@ucanto/principal/ed25519'
import * as RSASigner from '@ucanto/principal/rsa'
import * as Store from '../../src/store/indexed-db.js'
import * as DB from '../../src/agent/db.js'
import * as Agent from '../../src/agent.js'

describe('IndexedDB store', () => {
  it('should create and load data', async () => {
    const store = Store.open({ name: 'test-w3up-db-' + Date.now() })
    const agent = await Agent.open({
      store,
    })

    await store.connect()
    await DB.save(agent.db)

    const exportData = await store.load()
    assert.ok(exportData)

    // principal private key is not extractable
    const archive = exportData.principal
    assert(!(archive instanceof Uint8Array))
    // eslint-disable-next-line no-unused-vars
    const [[_, key], ...keys] = [...Object.entries(archive.keys)]
    assert.deepEqual(keys, [])
    assert(key instanceof CryptoKey)
    assert.equal(key.extractable, false)

    // no accounts or delegations yet
    assert.equal(exportData.delegations.size, 0)

    // default meta
    assert.equal(exportData.meta.name, 'agent')
    assert.equal(exportData.meta.type, 'device')
  })

  it('should allow custom store name', async () => {
    const store = Store.open({
      name: 'test-w3up-db-' + Date.now(),
      storeName: `store-${Date.now()}`,
    })
    await store.connect()

    const agent = await Agent.open({
      store,
    })
    await DB.save(agent.db)

    await store.close()
    await store.connect()

    const archive = await DB.toArchive(agent.db)
    assert.ok(archive)

    const db = DB.fromArchive(archive)

    assert.equal(db.signer?.id, agent.did())
  })

  it('should close and disallow usage', async () => {
    const store = Store.open({
      name: 'test-w3up-db-' + Date.now(),
      autoOpen: false,
    })

    await store.connect()
    await store.load()
    await store.close()

    // should fail
    await assert.rejects(store.save({}), { message: 'Store is not open' })
    await assert.rejects(store.close(), { message: 'Store is not open' })
  })

  it('should round trip delegations', async () => {
    const store = Store.open({
      name: 'test-w3up-db-' + Date.now(),
    })
    await store.connect()

    const agent = await Agent.open({ store })

    const signer = await EdSigner.generate()
    const proof = await top.delegate({
      issuer: signer,
      audience: agent,
      with: signer.did(),
      expiration: Infinity,
    })

    await DB.transact(agent.db, [DB.assert({ proof })])

    await DB.save(agent.db)

    const archive = await store.load()
    assert.ok(archive)

    const db = DB.from({ archive })

    const { delegation } = db.proofs.get(`${proof.cid}`) ?? {}

    assert.deepEqual(delegation, proof)
  })

  it('should be resettable', async () => {
    const store = Store.open({ name: 'test-w3up-db-' + Date.now() })
    const agent = await Agent.open({ store })

    await store.connect()
    await DB.save(agent.db)

    const exportData = await store.load()
    assert.equal(exportData?.principal.id, agent.did())

    await store.reset()
    const resetExportData = await store.load()
    assert.equal(resetExportData?.principal.id, undefined)
  })
})
