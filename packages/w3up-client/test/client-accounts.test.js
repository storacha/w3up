import * as Test from './test.js'
import * as Account from '../src/account.js'

/**
 * @type {Test.Suite}
 */
export const testClientAccounts = Test.withContext({
  'list accounts': async (assert, { client, mail, grantAccess }) => {
    const email = 'alice@web.mail'

    assert.deepEqual(client.accounts(), {}, 'no accounts yet')

    const login = Account.login(client, email)
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)
    const session = await login
    assert.equal(session.error, undefined)
    assert.equal(session.ok?.did(), Account.fromEmail(email))
    assert.equal(session.ok?.toEmail(), email)
    assert.equal(session.ok?.proofs.length, 2)

    assert.deepEqual(client.accounts(), {}, 'no accounts have been saved')
    await session.ok?.save()
    const accounts = client.accounts()

    assert.deepEqual(Object.values(accounts).length, 1)
    assert.ok(accounts[Account.fromEmail(email)])

    const account = accounts[Account.fromEmail(email)]
    assert.equal(account.toEmail(), email)
    assert.equal(account.did(), Account.fromEmail(email))
    assert.equal(account.proofs.length, 2)
  },
})

Test.test({ 'Client accounts': testClientAccounts })
