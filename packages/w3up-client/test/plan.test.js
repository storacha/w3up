import * as Test from './test.js'
import * as Account from '../src/account.js'
import * as Task from '../src/task.js'

/**
 * @type {Test.Suite}
 */
export const testPlan = {
  'test account has no plans': async (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const email = 'alice@web.mail'
      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())

      yield* Task.wait(grantAccess(message))
      const alice = yield* Task.join(login)
      yield* Task.join(alice.save())

      assert.deepEqual(
        Object.keys(Account.list(session)),
        [alice.did()],
        'account was saved'
      )

      const plans = yield* Task.join(alice.plans.list())
      assert.deepEqual(plans, {})

      return { ok: {} }
    }),
  'test account with a plan': async (
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
      assert.ok(plan.subscriptions)

      return { ok: {} }
    }),
}

Test.test({ Plan: testPlan })
