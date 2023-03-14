import { context } from './helpers/context.js'
import { createTesterFromContext } from './helpers/ucanto-test-utils.js'
import * as principal from '@ucanto/principal'
import { Agent as AccessAgent } from '@web3-storage/access/agent'
import * as w3caps from '@web3-storage/capabilities'
import * as assert from 'assert'
import * as Ucanto from '@ucanto/interface'

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
    it.skip('can authorize', async () => {
      const accessAgent = await AccessAgent.create(undefined, {
        connection: await accessApiVariant.connection,
      })
      await accessAgent.authorize('example@dag.house')
    })

    it('can be used to do session authorization', async () => {
      await testSessionAuthorization(
        await AccessAgent.create(undefined, {
          connection: await accessApiVariant.connection,
        }),
        { did: () => 'did:mailto:dag.house:example' }
      )
    })
  })
}

/**
 * @typedef {import('./provider-add.test.js').AccessAuthorize} AccessAuthorize
 * @typedef {import('./helpers/ucanto-test-utils.js').AccessService} AccessService
 */

/**
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 */
async function testSessionAuthorization(access, account) {
  const authorizeResult = await access.invokeAndExecute(
    w3caps.Access.authorize,
    {
      audience: access.connection.id,
      nb: {
        iss: account.did(),
        att: [{ can: '*' }],
      },
    }
  )
  assert.notDeepStrictEqual(
    authorizeResult.error,
    true,
    'authorize result is not an error'
  )
}
