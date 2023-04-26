import { context } from './helpers/context.js'
import { createTesterFromContext } from './helpers/ucanto-test-utils.js'
import { ed25519 } from '@ucanto/principal'
import { claim } from '@web3-storage/capabilities/access'
import * as assert from 'assert'

/**
 * Run the same tests against several variants of access/delegate handlers.
 */
for (const handlerVariant of /** @type {const} */ ([
  {
    name: 'handled by access-api in miniflare',
    ...(() => {
      const spaceWithStorageProvider = ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromContext(() => context(), {
          registerSpaces: [spaceWithStorageProvider],
          account: {
            did: () => /** @type {const} */ ('did:mailto:example.com:foo'),
          },
        }),
      }
    })(),
  },
])) {
  describe(`access-claim ${handlerVariant.name}`, () => {
    it(`can be invoked`, async () => {
      const issuer = await handlerVariant.issuer
      const result = await handlerVariant.invoke(
        await claim
          .invoke({
            issuer,
            audience: await handlerVariant.audience,
            with: issuer.did(),
          })
          .delegate()
      )
      // @ts-expect-error type not inferred correctly
      assert.ok(result.out.ok)
      assert.deepEqual(
        // @ts-expect-error type not inferred correctly
        'delegations' in result.out.ok,
        true,
        'result contains delegations set'
      )
    })
  })

  // there are more tests about `testDelegateThenClaim` in ./access-delegate.test.js
}
