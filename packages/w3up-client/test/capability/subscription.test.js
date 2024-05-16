import * as Test from '../test.js'
import * as Account from '../../src/account.js'
import * as Result from '../../src/result.js'

export const SubscriptionClient = Test.withContext({
  list: {
    'should list subscriptions': async (
      assert,
      { client, connection, service, plansStorage, grantAccess, mail }
    ) => {
      const space = await client.createSpace('test')
      const email = 'alice@web.mail'
      const login = Account.login(client, email)
      const message = await mail.take()
      assert.deepEqual(message.to, email)
      await grantAccess(message)
      const account = Result.try(await login)
      await account.save()

      assert.deepEqual(
        await client.capability.subscription.list(account.did()),
        { results: [] }
      )

      const result = await account.provision(space.did())
      assert.ok(result.ok)

      assert.deepEqual(
        await client.capability.subscription.list(account.did(), {
          nonce: 'retry',
        }),
        {
          results: [
            {
              provider: connection.id.did(),
              consumers: [space.did()],
              subscription: `${account.did()}:${space.did()}@${connection.id.did()}`,
            },
          ],
        }
      )
    },
  },
})

Test.test({ SubscriptionClient })
