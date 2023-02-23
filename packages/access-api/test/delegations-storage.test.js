import { context } from './helpers/context.js'
import { DbDelegationsStorage } from '../src/models/delegations.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import { createSampleDelegation } from '../src/utils/ucan.js'

describe('DbDelegationsStorage', () => {
  it('should persist delegations', async () => {
    const { d1 } = await context()
    const storage = new DbDelegationsStorage(createD1Database(d1))
    const count = Math.round(Math.random() * 10)
    const delegations = await Promise.all(
      Array.from({ length: count }).map(() => createSampleDelegation())
    )
    await storage.putMany(...delegations)
    assert.deepEqual(await storage.count(), delegations.length)
  })
})
