import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as Test from './test.js'
import { Space } from '../src/space.js'
import * as Account from '../src/account.js'
import * as Result from '../src/result.js'
import { randomCAR } from './helpers/random.js'

/**
 * @type {Test.Suite}
 */
export const testSpace = Test.withContext({
  'should get meta': async (assert, { client }) => {
    const signer = await Signer.generate()
    const name = `space-${Date.now()}`
    const space = new Space({
      id: signer.did(),
      meta: { name },
      agent: client.agent,
    })
    assert.equal(space.did(), signer.did())
    assert.equal(space.name, name)
    assert.equal(space.meta()?.name, name)
  },

  'should get usage': async (assert, { client, grantAccess, mail }) => {
    const space = await client.createSpace('test', {
      skipGatewayAuthorization: true,
    })

    const email = 'alice@web.mail'
    const login = Account.login(client, email)
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const account = Result.try(await login)

    Result.try(await account.provision(space.did()))
    await space.save()

    const size = 1138
    const archive = await randomCAR(size)
    await client.agent.invokeAndExecute(StoreCapabilities.add, {
      nb: {
        link: archive.cid,
        size,
      },
    })

    const found = client.spaces().find((s) => s.did() === space.did())
    if (!found) return assert.fail('space not found')

    const usage = Result.unwrap(await found.usage.get())
    assert.equal(usage, BigInt(size))
  },
})

Test.test({ Space: testSpace })
