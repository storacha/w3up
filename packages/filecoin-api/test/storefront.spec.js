/* eslint-disable no-only-tests/no-only-tests */
import * as assert from 'assert'
import * as Storefront from './services/storefront.js'
import * as Signer from '@ucanto/principal/ed25519'

import { Store } from './context/store.js'
import { Queue } from './context/queue.js'

describe('filecoin/*', () => {
  for (const [name, test] of Object.entries(Storefront.test)) {
    const define = name.startsWith('only ')
      ? it.only
      : name.startsWith('skip ')
      ? it.skip
      : it

    define(name, async () => {
      const signer = await Signer.generate()
      const id = signer.withDID('did:web:test.web3.storage')

      // resources
      const addQueue = new Queue()
      const pieceStore = new Store()
      const aggregatorDid = ''
      const aggregatorUrl = ''

      await test(
        {
          equal: assert.strictEqual,
          deepEqual: assert.deepStrictEqual,
          ok: assert.ok,
        },
        {
          id,
          errorReporter: {
            catch(error) {
              assert.fail(error)
            },
          },
          addQueue,
          pieceStore,
          aggregatorDid,
          aggregatorUrl,
        }
      )
    })
  }
})
