import { context } from './helpers/context.js'
import { DbProvisions } from '../src/models/provisions.js'
import { createD1Database } from '../src/utils/d1.js'
import * as assert from 'node:assert'
import * as principal from '@ucanto/principal'
import { Provider } from '@web3-storage/capabilities'
import { CID } from 'multiformats'

describe('DbProvisions', () => {
  it('should persist provisions', async () => {
    const { d1, service } = await context()
    const db = createD1Database(d1)
    const storage = new DbProvisions([service.did()], db)
    const count = 2 + Math.round(Math.random() * 3)
    const spaceA = await principal.ed25519.generate()
    const [firstProvision, ...lastProvisions] = await Promise.all(
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
        /** @type {import('../src/types/provisions.js').Provision<'did:web:web3.storage:providers:w3up-alpha'>} */
        const provision = {
          invocation,
          space: spaceA.did(),
          provider: 'did:web:web3.storage:providers:w3up-alpha',
          account: issuer.did(),
        }
        return provision
      })
    )
    await Promise.all(lastProvisions.map((p) => storage.put(p)))
    assert.deepEqual(await storage.count(), lastProvisions.length)

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

    // ensure no error if we try to store same provision twice
    // all of lastProvisions are duplicate, but firstProvision is new so that should be added
    await storage.put(lastProvisions[0])
    await storage.put(firstProvision)
    assert.deepEqual(await storage.count(), count)

    // but if we try to store the same provision (same `cid`) with different
    // fields derived from invocation, it should error
    const modifiedFirstProvision = {
      ...firstProvision,
      space: /** @type {const} */ ('did:key:foo'),
      account: /** @type {const} */ ('did:mailto:example.com:foo'),
      // note this type assertion is wrong, but useful to set up the test
      provider: /** @type {import('@ucanto/interface').DID<'web'>} */ (
        'did:provider:foo'
      ),
    }
    const result = await storage.put(modifiedFirstProvision)
    assert.equal(
      result.error && result.name,
      'ConflictError',
      'cannot put with same cid but different derived fields'
    )

    const provisionForFakeConsumer = await storage.findForConsumer(
      modifiedFirstProvision.space
    )
    assert.deepEqual(provisionForFakeConsumer.length, 0)
    assert.deepEqual(
      await storage.count(),
      count,
      'count was not increased by put w/ existing cid'
    )
  })
})
