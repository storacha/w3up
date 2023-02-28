import {
  createTesterFromHandler,
  warnOnErrorResult,
} from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import * as provider from '@web3-storage/capabilities/provider'
import * as assert from 'assert'
import { createProviderAddHandler } from '../src/service/provider-add.js'

/**
 * Run the same tests against several variants of access/delegate handlers.
 */
for (const handlerVariant of /** @type {const} */ ([
  // {
  //   name: 'handled by access-api in miniflare',
  //   ...(() => {
  //     const spaceWithStorageProvider = principal.ed25519.generate()
  //     return {
  //       spaceWithStorageProvider,
  //       ...createTesterFromContext(() => context(), {
  //         registerSpaces: [spaceWithStorageProvider],
  //       }),
  //     }
  //   })(),
  // },
  {
    name: 'handled by access-delegate-handler',
    ...(() => {
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromHandler(() => createProviderAddHandler()),
      }
    })(),
  },
])) {
  describe(`provider/add ${handlerVariant.name}`, () => {
    it(`can be invoked`, async () => {
      const space = await principal.ed25519.generate()
      const issuer = await handlerVariant.issuer
      const result = await handlerVariant.invoke(
        await provider.add
          .invoke({
            issuer,
            audience: await handlerVariant.audience,
            with: `did:mailto:example.com:foo`,
            nb: {
              consumer: space.did(),
              provider: 'did:web:web3.storage:providers:w3up-alpha',
            },
          })
          .delegate()
      )
      warnOnErrorResult(result)
      assert.deepEqual('name' in result && result.name, 'NotImplemented')
    })
  })
}
