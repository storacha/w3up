import assert from 'assert'
import { StoreIndexedDB } from '../../src/stores/store-indexeddb.js'

describe('IndexedDB store', () => {
  it('works', async () => {
    const store = await StoreIndexedDB.create('test-access-db')
    const data = await store.load()
    assert(data)
  })
})
