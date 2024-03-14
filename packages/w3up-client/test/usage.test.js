import * as Test from './test.js'
import * as Task from '../src/task.js'
import * as Result from '../src/result.js'

/**
 * @type {Test.Suite}
 */
export const testUsage = {
  'space.usage.report()': (
    assert,
    { mail, session, grantAccess, plansStorage }
  ) =>
    Task.spawn(function* () {
      // First we login to the workshop account
      const login = session.accounts.login({ email: 'alice@web.mail' })
      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))
      const account = yield* login
      // Result.unwrap(await session.accounts.add(account))

      // Then we setup a billing for this account
      yield* Task.wait(
        plansStorage.set(account.did(), 'did:web:test.web3.storage')
      )

      const space = yield* account.spaces.create({ name: 'home' })

      const [plan] = yield* account.plans.list()

      yield* plan.subscriptions.add({ consumer: space.did() })

      const period = { from: new Date(0), to: new Date(1709769229000) }

      const report = yield* space.usage.report(period)
      assert.deepEqual(report, {
        'did:web:test.web3.storage': {
          size: { final: 0, initial: 0 },
          space: space.did(),
          events: [],
          period: {
            from: period.from.toISOString(),
            to: period.to.toISOString(),
          },
          provider: 'did:web:test.web3.storage',
        },
      })

      const usage = yield* space.usage.get()
      assert.deepEqual(usage, 0n)
    }),
}

Test.test({ Access: testUsage })
