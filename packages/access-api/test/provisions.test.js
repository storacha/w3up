import { context } from './helpers/context.js'
import { DbProvisions } from '../src/models/provisions.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import * as principal from '@ucanto/principal'

describe('DbProvisions', () => {
  it('should persist provisions', async () => {
    const { d1 } = await context()
    const storage = new DbProvisions(createD1Database(d1))
    const count = Math.round(Math.random() * 10)
    const provisions = await Promise.all(
      Array.from({ length: count }).map(async () => {
        const consumer = await principal.ed25519.generate()
        const issuerKey = await principal.ed25519.generate()
        const issuer = issuerKey.withDID('did:mailto:example.com:foo')
        /** @type {import('../src/types/provisions.js').StorageProvisionCreation} */
        const provision = {
          space: consumer.did(),
          provider: 'did:web:web3.storage:providers:w3up-alpha',
          account: issuer.did(),
        }
        return provision
      })
    )
    await storage.putMany(...provisions)
    assert.deepEqual(await storage.count(), provisions.length)
  })
})
