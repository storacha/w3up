import * as Test from './test.js'
import * as Access from '../src/access.js'
import * as Result from '../src/result.js'
import * as Authorization from '../src/authorization/query.js'
import * as Space from '../src/space.js'
import * as API from '../src/types.js'
import * as DB from '../src/agent/db.js'

/**
 * @type {Test.Suite}
 */
export const testAccess = {
  'access.request': async (assert, { session, mail, grantAccess }) => {
    const email = 'alice@web.mail'

    const account = Access.DIDMailto.fromEmail(email)
    const request = Result.unwrap(await Access.request(session, { account }))
    const message = await mail.take()
    assert.deepEqual(message.to, email)
    await grantAccess(message)

    assert.deepEqual(request.authority, session.agent.signer.did())
    assert.ok(request.expiration.getTime() >= Date.now())

    const access = Result.unwrap(await request.claim())
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

  'access delegate and claim': async (
    assert,
    { session, provisionsStorage }
  ) => {
    const space = await Space.create({ name: 'main' })
    Result.unwrap(
      await DB.transact(session.agent.db, [
        DB.assert({ proof: await space.createAuthorization(session.agent) }),
      ])
    )

    Result.unwrap(
      await provisionsStorage.put({
        // @ts-ignore
        cause: null,
        consumer: space.did(),
        customer: 'did:mailto:mail.com:user',
        provider: /** @type {API.ProviderDID} */ (session.connection.id.did()),
      })
    )

    const shared = await Space.generate({ name: 'shared' })
    const delegation = await shared.createAuthorization(session.agent)

    const result = await Access.delegate(session, {
      delegations: [delegation],
      subject: space.did(),
    })

    assert.ok(result.ok)

    const claim = Result.unwrap(await Access.claim(session))
    assert.deepEqual(claim.proofs, [delegation])

    const none = Authorization.find(session.agent.db, {
      authority: session.agent.did(),
      subject: shared.did(),
      can: { 'store/add': [] },
    })

    assert.deepEqual(none, [], 'claimed access has not been added to an agent')

    Result.unwrap(await claim.save())

    const [auth] = Authorization.find(session.agent.db, {
      authority: session.agent.did(),
      subject: shared.did(),
      can: { 'store/add': [] },
    })

    assert.deepEqual(
      auth,
      Authorization.from({
        authority: session.agent.did(),
        subject: shared.did(),
        can: { 'store/add': [] },
        proofs: [delegation],
      }),
      'claimed access has been added to an agent'
    )
  },
}

Test.test({ Access: testAccess })
