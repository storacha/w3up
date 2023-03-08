/* eslint-disable no-only-tests/no-only-tests */
import * as Store from './store.js'
import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import { CarStoreBucket } from './car-store-bucket.js'
import { StoreTable } from './store-table.js'
import { UploadTable } from './upload-table.js'
import { DudewhereBucket } from './dude-where-bucket.js'
import * as AccessVerifier from './access-verifier.js'

describe('store/*', () => {
  for (const [name, test] of Object.entries(Store.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
      ? it.skip
      : it

    define(name, async () => {
      const storeTable = new StoreTable()
      const uploadTable = new UploadTable()
      const carStoreBucket = await CarStoreBucket.activate()
      const dudewhereBucket = new DudewhereBucket()
      const signer = await Signer.generate()
      const id = signer.withDID('did:web:test.web3.storage')
      const access = AccessVerifier.create({ id })

      try {
        await test(
          {
            equal: assert.strictEqual,
            deepEqual: assert.deepStrictEqual,
          },
          {
            id,
            errorReporter: {
              catch(error) {
                assert.fail(error)
              },
            },
            maxUploadSize: 5_000_000_000,
            storeTable,
            testStoreTable: storeTable,
            uploadTable,
            carStoreBucket,
            dudewhereBucket,
            access,
            testSpaceRegistry: access,
          }
        )
      } finally {
        await carStoreBucket.deactivate()
      }
    })
  }
})
