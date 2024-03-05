import * as Test from './test.js'
import * as Account from '../src/account.js'
import * as Space from '../src/space.js'
import * as Result from '../src/result.js'
import * as Task from '../src/task.js'
import * as DB from '../src/agent/db.js'

/**
 * @type {Test.Suite}
 */
export const testAccount = {
  'list accounts': async (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const email = 'alice@web.mail'

      assert.deepEqual(session.accounts.list(), {}, 'no accounts yet')
      assert.deepEqual([...session.accounts], [], 'is iterable')

      const login = session.accounts.login({ email })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* Task.join(login)
      assert.equal(account.did(), Account.DIDMailto.fromEmail(email))
      assert.equal(account.toEmail(), email)
      assert.equal([...account.proofs].length, 2)

      assert.deepEqual(Account.list(session), {}, 'no accounts have been saved')
      yield* Task.join(session.accounts.add(account))
      const accounts = session.accounts.list()

      assert.deepEqual(Object.values(accounts).length, 1)
      assert.ok(accounts[Account.DIDMailto.fromEmail(email)])

      const savedAccount = accounts[Account.DIDMailto.fromEmail(email)]
      assert.equal(savedAccount.toEmail(), email)
      assert.equal(savedAccount.did(), Account.DIDMailto.fromEmail(email))
      assert.equal([...savedAccount.proofs].length, 2)

      return { ok: {} }
    }),

  'two logins': async (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const aliceEmail = 'alice@web.mail'
      const bobEmail = 'bob@web.mail'

      assert.deepEqual(session.accounts.list(), {}, 'no accounts yet')
      const aliceLogin = session.accounts.login({ email: aliceEmail })
      const aliceConfirm = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(aliceConfirm))
      const alice = yield* Task.join(aliceLogin)
      assert.deepEqual(alice.toEmail(), aliceEmail)

      assert.deepEqual(
        session.accounts.list(),
        {},
        'no accounts have been saved'
      )
      yield* Task.join(session.accounts.add(alice))

      const [one] = session.accounts
      assert.equal(one.did(), alice.did(), 'alice in the account list')

      const bobLogin = Account.login(session, { email: bobEmail })
      const bobConfirm = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(bobConfirm))
      const bob = yield* Task.join(bobLogin)
      assert.deepEqual(bob.toEmail(), bobEmail)
      yield* Task.join(session.accounts.add(bob))

      const two = Account.list(session)
      assert.deepEqual(Object.values(two).length, 2)

      assert.ok(
        two[Account.DIDMailto.fromEmail(aliceEmail)].toEmail(),
        aliceEmail
      )
      assert.ok(two[Account.DIDMailto.fromEmail(bobEmail)].toEmail(), bobEmail)

      return { ok: {} }
    }),

  'login idempotence': (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const email = 'alice@web.mail'
      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))
      const alice = yield* Task.join(login)

      yield* Task.join(session.accounts.add(alice))

      assert.deepEqual(
        Object.keys(Account.list(session)),
        [alice.did()],
        'account was saved'
      )

      const retry = yield* Task.join(Account.login(session, { email }))
      assert.deepEqual(
        alice.toJSON(),
        retry.toJSON(),
        'same account view is returned'
      )

      return { ok: {} }
    }),
  'account login': async (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const login = session.accounts.login({ email: 'alice@web.mail' })

      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))

      const alice = yield* Task.join(login)
      assert.deepEqual(alice.toEmail(), 'alice@web.mail')
      yield* Task.join(session.accounts.add(alice))

      const accounts = session.accounts.list()
      assert.deepEqual(Object.keys(accounts), [alice.did()])

      return { ok: {} }
    }),

  'create account and provision space': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) =>
    Task.perform(function* () {
      const space = yield* Task.join(session.spaces.create({ name: 'test' }))
      const mnemonic = space.toMnemonic()

      const { signer } = yield* Task.wait(
        Space.fromMnemonic(mnemonic, { name: 'import' })
      )

      assert.deepEqual(
        // @ts-expect-error
        space.agent.signer.encode(),
        signer.encode(),
        'arrived to same signer'
      )

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* Task.join(login)

      yield* Task.join(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )
      const plans = yield* Task.join(account.plans.list())
      const [{ subscriptions }] = Object.values(plans)

      yield* Task.join(subscriptions.add({ consumer: space.did() }))

      // authorize agent to use space

      const shared = yield* Task.join(
        space.share(session.agent.signer, {
          can: { 'space/info': [] },
        })
      )

      // yield* Task.join(session.spaces.add(shared))

      const info = yield* Task.join(shared.info())

      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      return { ok: {} }
    }),

  'multi device workflow': async (
    assert,
    { connection, mail, grantAccess, plansStorage }
  ) =>
    Task.perform(function* () {
      const laptop = yield* Task.join(Test.connect(connection))
      const space = yield* Task.join(laptop.spaces.create({ name: 'main' }))

      // want to provision space ?
      const email = 'alice@web.mail'
      const login = laptop.accounts.login({ email })
      // confirm by clicking a link
      const laptopMessage = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(laptopMessage))
      const account = yield* Task.join(login)

      // setup billing
      yield* Task.join(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )
      // Authorized account can provision space
      const plans = yield* Task.join(account.plans.list())
      const [{ subscriptions }] = Object.values(plans)

      yield* Task.join(subscriptions.add({ consumer: space.did() }))

      // // Want to setup a recovery for this space ?
      const recovery = yield* Task.join(space.createRecovery(account))

      // Store space delegation in the space so that account can claim it.
      yield* Task.join(space.delegations.add(recovery))

      // now connect with a second device
      const phone = yield* Task.join(Test.connect(connection))
      const phoneLogin = phone.accounts.login({ email })
      // confirm by clicking a link
      const phoneMessage = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(phoneMessage))
      const phoneAccount = yield* Task.join(phoneLogin)

      const [phoneSpace] = phoneAccount.spaces
      assert.deepEqual(phoneSpace.did(), space.did())

      return { ok: {} }
    }),

  'check account plan': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) => {
    const result = Task.perform(function* () {
      const login = session.accounts.login({ email: 'alice@web.mail' })

      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))

      const account = yield* Task.join(login)

      const plans = yield* Task.join(account.plans.list())
      assert.deepEqual(plans, {}, 'no plans yet')

      yield* Task.join(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )

      const updatePlans = yield* Task.join(account.plans.list())
      assert.deepEqual(Object.keys(updatePlans), ['did:web:free.web3.storage'])

      return { ok: {} }
    })

    try {
      await result
    } catch (error) {
      // throw new Error(error)
      console.log('error', error)
      throw error
    }
  },

  'check account subscriptions': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) =>
    Task.perform(function* () {
      const space = yield* Task.join(session.spaces.create({ name: 'test' }))

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })
      // confirm by clicking a link
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* Task.join(login)

      // setup billing
      yield* Task.join(
        plansStorage.set(account.did(), 'did:web:test.web3.storage')
      )
      // Authorized account can provision space
      const plans = yield* Task.join(account.plans.list())
      const [{ subscriptions }] = Object.values(plans)

      yield* Task.join(subscriptions.add({ consumer: space.did() }))

      const [...subs] = yield* Task.join(subscriptions.list())

      assert.deepEqual(subs, [
        {
          customer: account.did(),
          consumer: space.did(),
          provider: 'did:web:test.web3.storage',
          limit: {},
        },
      ])

      const second = yield* Task.join(session.spaces.create({ name: 'second' }))
      yield* Task.join(subscriptions.add({ consumer: second.did() }))

      const [...subs2] = yield* Task.join(subscriptions.list())

      assert.deepEqual(subs2, [
        {
          customer: account.did(),
          consumer: space.did(),
          provider: 'did:web:test.web3.storage',
          limit: {},
        },
        {
          customer: account.did(),
          consumer: second.did(),
          provider: 'did:web:test.web3.storage',
          limit: {},
        },
      ])

      return { ok: {} }
    }),
}

Test.test({ Account: testAccount })
