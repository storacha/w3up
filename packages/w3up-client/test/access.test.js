import * as Test from './test.js'
import * as Access from '../src/access.js'
import * as Result from '../src/result.js'
import * as Authorization from '../src/agent/authorization.js'

/**
 * @type {Test.Suite}
 */
export const testAccess = {
  'capability.access.request': async (
    assert,
    { session, mail, grantAccess }
  ) => {
    const email = 'alice@web.mail'

    const account = Access.DIDMailto.fromEmail(email)
    const request = Result.unwrap(await Access.request(session, { account }))
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)

    assert.deepEqual(request.authority, session.agent.did())
    assert.ok(request.expiration.getTime() >= Date.now())

    const access = Result.try(await request.claim())
    assert.ok(access.proofs.length > 0)

    const results = Authorization.find(session.agent.db, {
      authority: session.agent.did(),
      can: { 'store/add': [] },
    })

    assert.deepEqual(results, [])

    Result.unwrap(await access.save())
    const [login] = Authorization.find(session.agent.db, {
      authority: session.agent.did(),
      can: { 'store/add': [] },
    })
    assert.ok(login)
    assert.equal(login.authority, session.agent.did())
    assert.equal(login.subject, 'ucan:*')
    assert.deepEqual(login.can, { 'store/add': [] })
    assert.ok(login.proofs.length > 0)

    const [auth] = Authorization.find(session.agent.db, {
      can: { 'store/add': [] },
      authority: session.agent.did(),
      subject: account,
    })

    assert.ok(auth)
    assert.equal(auth.authority, session.agent.did())
    assert.equal(auth.subject, account)
    assert.ok(auth.proofs.length > 0)
  },
}

Test.test({ Access: testAccess })
