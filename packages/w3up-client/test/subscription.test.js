import * as Test from './test.js'
import * as Account from '../src/account.js'
import * as Task from '../src/task.js'
import * as Space from '../src/space.js'

/**
 * @type {Test.Suite}
 */
export const testSubscription = {
  'provision a space': async (
    assert,
    { session, mail, plansStorage, grantAccess }
  ) =>
    Task.perform(function* () {
      const product = 'did:web:test.web3.storage'
      const email = 'alice@web.mail'
      yield* Task.join(
        plansStorage.set(Account.DIDMailto.fromEmail(email), product)
      )

      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())

      yield* Task.wait(grantAccess(message))
      const alice = yield* Task.join(login)

      const plans = yield* Task.join(alice.plans.list())
      const [plan] = Object.values(plans)

      assert.equal(plan.account, alice)
      assert.equal(plan.customer, alice.did())
      assert.equal(plan.provider, session.connection.id.did())

      const space = yield* Task.wait(Space.generate({ name: 'test-space' }))

      plan.subscriptions.add({ consumer: space.did() })

      space.createAuthorization(session.agent)

      const info = yield* Task.join(Space.info(session, { id: space.did() }))
      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      return { ok: {} }
    }),
}

Test.test({ Subscription: testSubscription })
