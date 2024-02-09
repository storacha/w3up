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
  'only list accounts': async (assert, { session, mail, grantAccess }) => {
    const email = 'alice@web.mail'

    assert.deepEqual(Account.list(session), {}, 'no accounts yet')

    const login = Account.login(session, { email })
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const account = Result.unwrap(await login)
    assert.equal(account.did(), Account.DIDMailto.fromEmail(email))
    assert.equal(account.toEmail(), email)
    assert.equal([...account.proofs].length, 2)

    assert.deepEqual(Account.list(session), {}, 'no accounts have been saved')
    Result.unwrap(await account.save())
    const accounts = Account.list(session)

    assert.deepEqual(Object.values(accounts).length, 1)
    assert.ok(accounts[Account.DIDMailto.fromEmail(email)])

    const savedAccount = accounts[Account.DIDMailto.fromEmail(email)]
    assert.equal(savedAccount.toEmail(), email)
    assert.equal(savedAccount.did(), Account.DIDMailto.fromEmail(email))
    assert.equal([...savedAccount.proofs].length, 2)
  },

  'only two logins': async (assert, { session, mail, grantAccess }) => {
    const aliceEmail = 'alice@web.mail'
    const bobEmail = 'bob@web.mail'

    assert.deepEqual(Account.list(session), {}, 'no accounts yet')
    const aliceLogin = Account.login(session, { email: aliceEmail })
    await grantAccess(await mail.take())
    const alice = Result.unwrap(await aliceLogin)
    assert.deepEqual(alice.toEmail(), aliceEmail)

    assert.deepEqual(Account.list(session), {}, 'no accounts have been saved')
    Result.unwrap(await alice.save())

    const one = Account.list(session)
    assert.deepEqual(Object.values(one).length, 1)
    assert.ok(
      one[Account.DIDMailto.fromEmail(aliceEmail)],
      'alice in the account list'
    )

    const bobLogin = Account.login(session, { email: bobEmail })
    await grantAccess(await mail.take())
    const bob = Result.unwrap(await bobLogin)
    assert.deepEqual(bob.toEmail(), bobEmail)
    await bob.save()

    const two = Account.list(session)

    assert.deepEqual(Object.values(two).length, 2)

    assert.ok(
      two[Account.DIDMailto.fromEmail(aliceEmail)].toEmail(),
      aliceEmail
    )
    assert.ok(two[Account.DIDMailto.fromEmail(bobEmail)].toEmail(), bobEmail)
  },

  'only login idempotence': async (assert, { session, mail, grantAccess }) =>
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

      const retry = yield* Task.join(Account.login(session, { email }))
      assert.deepEqual(
        alice.toJSON(),
        retry.toJSON(),
        'same account view is returned'
      )

      return { ok: {} }
    }),
  'only account login': async (assert, { session, mail, grantAccess }) =>
    Task.perform(function* () {
      const login = Account.login(session, { email: 'alice@web.mail' })

      const message = yield* Task.wait(mail.take())
      yield* Task.wait(grantAccess(message))

      const alice = yield* Task.join(login)
      assert.deepEqual(alice.toEmail(), 'alice@web.mail')
      yield* Task.join(alice.save())

      const accounts = Account.list(session)
      assert.deepEqual(Object.keys(accounts), [alice.did()])

      return { ok: {} }
    }),

  'create account and provision space': async (
    assert,
    { session, mail, grantAccess }
  ) =>
    Task.perform(function* () {
      const space = yield* Task.wait(Space.generate({ name: 'test' }))
      const mnemonic = space.toMnemonic()
      const { signer } = yield* Task.wait(
        Space.fromMnemonic(mnemonic, { name: 'import' })
      )
      assert.deepEqual(
        space.signer.encode(),
        signer.encode(),
        'arrived to same signer'
      )

      const email = 'alice@web.mail'
      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))
      const account = yield* Task.join(login)

      yield* Task.join(account.provision(space.did()))

      // authorize agent to use space

      const proof = yield* Task.wait(
        space.createAuthorization(session.agent, {
          access: { 'space/info': {} },
          expiration: Infinity,
        })
      )

      yield* Task.join(DB.transact(session.agent.db, [DB.assert({ proof })]))

      const info = yield* Task.join(Space.info(session, { id: space.did() }))

      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      return { ok: {} }
    }),

  'multi device workflow': async (asserts, { connect, mail, grantAccess }) => {
    const laptop = await connect()
    const space = await laptop.createSpace('main')

    // want to provision space ?
    const email = 'alice@web.mail'
    const login = Account.login(laptop, email)
    // confirm by clicking a link
    await grantAccess(await mail.take())
    const account = Result.try(await login)

    // Authorized account can provision space
    Result.try(await account.provision(space.did()))

    // Want to setup a recovery for this space ?
    const recovery = await space.createRecovery(account.did())
    // Authorize laptop to use the space, we need to do it in order
    // to be able to store the recovery delegation in the space.
    await laptop.addSpace(await space.createAuthorization(laptop.agent))

    // Store delegation to the account so it can be used for recovery
    await laptop.capability.access.delegate({
      delegations: [recovery],
    })

    // now connect with a second device
    const phone = await connect()
    const phoneLogin = Account.login(phone, email)
    // confirm by clicking a link
    await grantAccess(await mail.take())
    const session = Result.try(await phoneLogin)
    // save session on the phone
    Result.try(await session.save())

    const result = await phone.capability.space.info(space.did())
    asserts.deepEqual(result.did, space.did())
  },
  'setup recovery': async (assert, { client, mail, grantAccess }) => {
    const space = await client.createSpace('test')

    const email = 'alice@web.mail'
    const login = Account.login(client, email)
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const account = Result.try(await login)

    Result.try(await account.provision(space.did()))

    const recovery = await space.createRecovery(account.did())
    const share = await client.capability.access.delegate({
      space: space.did(),
      delegations: [recovery],
      proofs: [await space.createAuthorization(client)],
    })
    assert.equal(share.error, undefined)
    assert.deepEqual(client.spaces(), [])

    assert.deepEqual(client.spaces().length, 0, 'no spaces had been added')

    // waiting for a sec so that request CID will come out different
    // otherwise we will find previous authorization which does not
    // have the space delegation yet.
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // This is not a great flow but to fix this we need a new to upgrade
    // ucanto and then pull delegations for each account.
    const secondLogin = Account.login(client, email)
    await grantAccess(await mail.take())
    const secondAccount = Result.try(await secondLogin)

    Result.try(await secondAccount.save())

    assert.deepEqual(client.spaces().length, 1, 'spaces had been added')
  },

  'check account plan': async (
    assert,
    { client, mail, grantAccess, plansStorage }
  ) => {
    const login = Account.login(client, 'alice@web.mail')
    await grantAccess(await mail.take())
    const account = Result.try(await login)

    const { error } = await account.plan.get()
    assert.ok(error)

    Result.unwrap(
      await plansStorage.set(account.did(), 'did:web:free.web3.storage')
    )

    const { ok: plan } = await account.plan.get()

    assert.ok(plan?.product, 'did:web:free.web3.storage')
  },

  'check account subscriptions': async (
    assert,
    { client, mail, grantAccess }
  ) => {
    const space = await client.createSpace('test')

    const email = 'alice@web.mail'
    const login = Account.login(client, email)
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const account = Result.try(await login)

    Result.try(await account.provision(space.did()))

    const subs = Result.unwrap(await account.plan.subscriptions())

    assert.equal(subs.results.length, 1)
    assert.equal(subs.results[0].provider, client.defaultProvider())
    assert.deepEqual(subs.results[0].consumers, [space.did()])
    assert.equal(typeof subs.results[0].subscription, 'string')
  },

  'space.save': async (assert, { client, mail, grantAccess }) => {
    const space = await client.createSpace('test')
    assert.deepEqual(client.spaces(), [])

    const result = await space.save()
    assert.ok(result.ok)

    const spaces = client.spaces()
    assert.deepEqual(spaces.length, 1)
    assert.deepEqual(spaces[0].did(), space.did())

    assert.deepEqual(client.currentSpace()?.did(), space.did())
  },
}

Test.test({ Account: testAccount })
