import * as Test from './test.js'
import * as Account from '../src/account.js'
import * as Space from '../src/space.js'
import * as Task from '../src/task.js'

/**
 * @type {Test.Suite}
 */
export const testAccount = {
  'list accounts': async (assert, { session, mail, grantAccess }) =>
    Task.spawn(function* () {
      const email = 'alice@web.mail'

      assert.deepEqual(session.accounts.list(), {}, 'no accounts yet')
      assert.deepEqual([...session.accounts], [], 'is iterable')

      const login = session.accounts.login({ email })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* login
      assert.equal(account.did(), Account.DIDMailto.fromEmail(email))
      assert.equal(account.toEmail(), email)
      assert.equal([...account.proofs].length, 2)

      assert.deepEqual(Account.list(session), {}, 'no accounts have been saved')
      yield* session.accounts.add(account)
      const accounts = session.accounts.list()

      assert.deepEqual(Object.values(accounts).length, 1)
      assert.ok(accounts[Account.DIDMailto.fromEmail(email)])

      const savedAccount = accounts[Account.DIDMailto.fromEmail(email)]
      assert.equal(savedAccount.toEmail(), email)
      assert.equal(savedAccount.did(), Account.DIDMailto.fromEmail(email))
      assert.equal([...savedAccount.proofs].length, 2)
    }),

  'two logins': async (assert, { session, mail, grantAccess }) =>
    Task.spawn(function* () {
      const aliceEmail = 'alice@web.mail'
      const bobEmail = 'bob@web.mail'

      assert.deepEqual(session.accounts.list(), {}, 'no accounts yet')
      const aliceLogin = session.accounts.login({ email: aliceEmail })
      const aliceConfirm = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(aliceConfirm))
      const alice = yield* aliceLogin
      assert.deepEqual(alice.toEmail(), aliceEmail)

      assert.deepEqual(
        session.accounts.list(),
        {},
        'no accounts have been saved'
      )
      yield* session.accounts.add(alice)

      const [one] = session.accounts
      assert.equal(one.did(), alice.did(), 'alice in the account list')

      const bobLogin = Account.login(session, { email: bobEmail })
      const bobConfirm = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(bobConfirm))
      const bob = yield* bobLogin
      assert.deepEqual(bob.toEmail(), bobEmail)
      yield* session.accounts.add(bob)

      const two = Account.list(session)
      assert.deepEqual(Object.values(two).length, 2)

      assert.ok(
        two[Account.DIDMailto.fromEmail(aliceEmail)].toEmail(),
        aliceEmail
      )
      assert.ok(two[Account.DIDMailto.fromEmail(bobEmail)].toEmail(), bobEmail)
    }),

  'login idempotence': (assert, { session, mail, grantAccess }) =>
    Task.spawn(function* () {
      const email = 'alice@web.mail'
      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))
      const alice = yield* login

      yield* session.accounts.add(alice)

      assert.deepEqual(
        Object.keys(Account.list(session)),
        [alice.did()],
        'account was saved'
      )

      const retry = yield* Account.login(session, { email })
      assert.deepEqual(
        alice.toJSON(),
        retry.toJSON(),
        'same account view is returned'
      )

      return { ok: {} }
    }),
  'account login': async (assert, { session, mail, grantAccess }) =>
    Task.spawn(function* () {
      const login = session.accounts.login({ email: 'alice@web.mail' })

      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))

      const alice = yield* login
      assert.deepEqual(alice.toEmail(), 'alice@web.mail')
      yield* session.accounts.add(alice)

      const accounts = session.accounts.list()
      assert.deepEqual(Object.keys(accounts), [alice.did()])
    }),

  'create account and provision space': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) =>
    Task.spawn(function* () {
      const space = yield* session.spaces.create({ name: 'test' })
      const mnemonic = space.toMnemonic()

      const imported = yield* Space.fromMnemonic(session, {
        name: 'import',
        mnemonic,
      })

      assert.deepEqual(imported.did(), space.did())
      assert.deepEqual(imported.authority, space.did())

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* login

      yield* Task.wait(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )
      const plans = yield* account.plans.list()
      const [{ subscriptions }] = Object.values(plans)

      yield* subscriptions.add({ consumer: space.did() })

      // authorize agent to use space

      const shared = yield* space.share({
        audience: session.agent.signer,
        can: { 'space/info': [] },
      })

      const info = yield* shared.info()

      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })
    }),

  'multi device workflow': async (
    assert,
    { connection, mail, grantAccess, plansStorage }
  ) =>
    Task.spawn(function* () {
      const laptop = yield* Test.connect(connection)
      const space = yield* laptop.spaces.create({ name: 'main' })

      // want to provision space ?
      const email = 'alice@web.mail'
      const login = laptop.accounts.login({ email })
      // confirm by clicking a link
      const laptopMessage = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(laptopMessage))
      const account = yield* login

      // setup billing
      yield* Task.ok.wait(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )

      // Authorized account can provision space
      const plans = yield* account.plans.list()
      const [{ subscriptions }] = Object.values(plans)

      yield* subscriptions.add({ consumer: space.did() })

      // Want to setup a recovery for this space ?
      const recovery = yield* space.createRecovery({ audience: account })

      // Store space delegation in the space so that account can claim it.
      yield* space.delegations.add(recovery)

      // now connect with a second device
      const phone = yield* Task.wait(Test.connect(connection))
      const phoneLogin = phone.accounts.login({ email })
      // confirm by clicking a link
      const phoneMessage = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(phoneMessage))
      const phoneAccount = yield* phoneLogin

      const [phoneSpace] = phoneAccount.spaces
      assert.deepEqual(phoneSpace.did(), space.did())
    }),

  'check account plan': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) =>
    Task.spawn(function* () {
      const login = session.accounts.login({ email: 'alice@web.mail' })

      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))

      const account = yield* login

      const plans = yield* account.plans.list()
      assert.deepEqual(plans, {}, 'no plans yet')

      yield* Task.wait(
        plansStorage.set(account.did(), 'did:web:free.web3.storage')
      )

      const updatePlans = yield* account.plans.list()
      assert.deepEqual(Object.keys(updatePlans), ['did:web:free.web3.storage'])
    }),
  'check account subscriptions': async (
    assert,
    { session, mail, grantAccess, plansStorage }
  ) =>
    Task.spawn(function* () {
      const space = yield* session.spaces.create({ name: 'test' })

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })
      // confirm by clicking a link
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* login

      // setup billing
      yield* Task.ok.wait(
        plansStorage.set(account.did(), 'did:web:test.web3.storage')
      )
      // Authorized account can provision space
      const plans = yield* account.plans.list()
      const [{ subscriptions }] = Object.values(plans)

      yield* subscriptions.add({ consumer: space.did() })

      const [...subs] = yield* subscriptions.list()

      assert.deepEqual(subs, [
        {
          customer: account.did(),
          consumer: space.did(),
          provider: 'did:web:test.web3.storage',
          limit: {},
        },
      ])

      const second = yield* session.spaces.create({ name: 'second' })

      yield* subscriptions.add({ consumer: second.did() })

      const [...subs2] = yield* subscriptions.list()

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
