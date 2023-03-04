import { context } from './helpers/context.js'
import { DbProvisions } from '../src/models/provisions.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import * as principal from '@ucanto/principal'
import { Provider } from '@web3-storage/capabilities'
import { CID } from 'multiformats'

describe('DbProvisions', () => {
  it('should persist provisions', async () => {
    const { d1 } = await context()
    const storage = new DbProvisions(createD1Database(d1))
    const count = Math.round(Math.random() * 10)
    const spaceA = await principal.ed25519.generate()
    const provisions = await Promise.all(
      Array.from({ length: count }).map(async () => {
        const issuerKey = await principal.ed25519.generate()
        const issuer = issuerKey.withDID('did:mailto:example.com:foo')
        const invocation = await Provider.add
          .invoke({
            issuer,
            audience: issuer,
            with: issuer.did(),
            nb: {
              consumer: spaceA.did(),
              provider: 'did:web:web3.storage:providers:w3up-alpha',
            },
          })
          .delegate()
        /** @type {import('../src/types/provisions.js').StorageProvisionCreation} */
        const provision = {
          invocation,
          space: spaceA.did(),
          provider: 'did:web:web3.storage:providers:w3up-alpha',
          account: issuer.did(),
        }
        return provision
      })
    )
    await storage.putMany(...provisions)
    assert.deepEqual(await storage.count(), provisions.length)

    const spaceHasStorageProvider = await storage.hasStorageProvider(
      spaceA.did()
    )
    assert.deepEqual(spaceHasStorageProvider, true)

    for (const provision of await storage.findForConsumer(spaceA.did())) {
      assert.deepEqual(typeof provision.cid, 'string')
      assert.doesNotThrow(
        () => CID.parse(provision.cid),
        'can parse provision.cid as CID'
      )
    }
  })
})
