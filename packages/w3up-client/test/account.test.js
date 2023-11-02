import * as Test from './test.js'
import * as Account from '../src/account.js'

/**
 * @type {Test.Suite}
 */
export const testAccount = {
  'list accounts': async (assert, { client, mail, grantAccess }) => {
    const email = 'alice@web.mail'

    assert.deepEqual(Account.list(client), {}, 'no accounts yet')

    const login = Account.login(client, email)
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const session = await login
    assert.equal(session.error, undefined)
    assert.equal(session.ok?.did(), Account.fromEmail(email))
    assert.equal(session.ok?.toEmail(), email)
    assert.equal(session.ok?.proofs.length, 2)

    const accounts = Account.list(client)

    assert.ok(accounts[Account.fromEmail(email)])

    const account = accounts[Account.fromEmail(email)]
    assert.equal(account.toEmail(), email)
    assert.equal(account.did(), Account.fromEmail(email))
  },

  'only two logins': async (assert, { client, mail, grantAccess }) => {
    const aliceEmail = 'alice@web.mail'
    const bobEmail = 'bob@web.mail'

    assert.deepEqual(Account.list(client), {}, 'no accounts yet')
    const aliceLogin = Account.login(client, aliceEmail)
    await grantAccess(await mail.take())
    const alice = await aliceLogin
    assert.deepEqual(alice.ok?.toEmail(), aliceEmail)

    const one = Account.list(client)
    assert.ok(one[Account.fromEmail(aliceEmail)])

    const bobLogin = Account.login(client, bobEmail)
    await grantAccess(await mail.take())
    const bob = await bobLogin
    assert.deepEqual(bob.ok?.toEmail(), bobEmail)

    const two = Account.list(client)

    assert.ok(two[Account.fromEmail(aliceEmail)].toEmail(), aliceEmail)
    assert.ok(two[Account.fromEmail(bobEmail)].toEmail(), bobEmail)
  },
}

Test.test(testAccount)
