import assert from 'assert'
import { StoreMemory } from '../../src/stores/store-memory.js'

describe('Store Memory', function () {
  it('should not be initialized', async function () {
    const store = new StoreMemory()

    assert.ok(!(await store.exists()))
  })
})
