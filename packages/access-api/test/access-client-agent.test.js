import { context } from './helpers/context.js'
import { createTesterFromContext } from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import { Agent as AccessAgent } from '@web3-storage/access/agent'
import * as assert from 'assert'

for (const accessApiVariant of /** @type {const} */ ([
  {
    name: 'using access-api in miniflare',
    ...(() => {
      const account = {
        did: () => /** @type {const} */ ('did:mailto:dag.house:foo'),
      }
      const spaceWithStorageProvider = principal.ed25519.generate()
      return {
        spaceWithStorageProvider,
        ...createTesterFromContext(context, {
          account,
          registerSpaces: [spaceWithStorageProvider],
        }),
      }
    })(),
  },
])) {
  describe(`access-client-agent ${accessApiVariant.name}`, () => {
    it('can createSpace', async () => {
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await accessApiVariant.connection,
      })
      const space = await accessAgent.createSpace('test-add')
      const delegations = accessAgent.proofs()
      assert.equal(space.proof.cid, delegations[0].cid)
    })
  })
  it.skip('can authorize', async () => {
    const accessAgent = await AccessAgent.create(undefined, {
      connection: await accessApiVariant.connection,
    })
    await accessAgent.authorize('example@dag.house')
  })
}
