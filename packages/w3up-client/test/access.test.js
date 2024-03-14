import * as Test from './test.js'
import * as Access from '../src/access.js'
import * as Authorization from '../src/authorization.js'
import * as Space from '../src/space.js'
import * as API from '../src/types.js'
import * as DB from '../src/agent/db.js'
import * as Task from '../src/task.js'

/**
 * @type {Test.Suite}
 */
export const testAccess = {
  'access.request': (assert, { session, mail, grantAccess }) =>
    Task.spawn(function* () {
      const email = 'alice@web.mail'

      const account = Access.DIDMailto.fromEmail(email)
      const request = yield* Access.request(session, { account })
      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))

      assert.deepEqual(request.authority, session.agent.signer.did())
      assert.ok(request.expiration.getTime() >= Date.now())

      const access = yield* request.claim()
      assert.ok(access.proofs.length > 0)

      const results = Authorization.find(session.agent.db, {
        audience: session.agent.did(),
        can: { 'store/add': [] },
      })

      assert.deepEqual(results, [])

      yield* access.save()
      const [login] = Authorization.find(session.agent.db, {
        audience: session.agent.did(),
        can: { 'store/add': [] },
      })
      assert.ok(login)
      assert.equal(login.authority, session.agent.did())
      assert.equal(login.subject, 'ucan:*')
      assert.deepEqual(login.can, { 'store/add': [] })
      assert.ok(login.proofs.length > 0)

      const [auth] = Authorization.find(session.agent.db, {
        can: { 'store/add': [] },
        audience: session.agent.did(),
        subject: account,
      })

      assert.ok(auth)
      assert.equal(auth.authority, session.agent.did())
      assert.equal(auth.subject, account)
      assert.ok(auth.proofs.length > 0)
    }),

  'access delegate and claim': (assert, { session, provisionsStorage }) =>
    Task.spawn(function* () {
      const space = yield* Space.create({ name: 'main', session })
      const { proofs } = yield* space.share({ audience: session.agent.signer })
      yield* DB.transact(
        session.agent.db,
        proofs.map((proof) => DB.assert({ proof }))
      )

      yield* Task.wait(
        provisionsStorage.put({
          // @ts-ignore
          cause: null,
          consumer: space.did(),
          customer: 'did:mailto:mail.com:user',
          provider: /** @type {API.ProviderDID} */ (
            session.connection.id.did()
          ),
        })
      )

      const shared = yield* Space.create({ name: 'shared', session })
      const { proofs: delegations } = yield* shared.share({
        audience: session.agent.signer,
      })

      yield* Access.delegate(session, {
        delegations,
        subject: space.did(),
      })

      const claim = yield* Access.claim(session)
      assert.deepEqual(claim.proofs, delegations)
      const none = Authorization.find(session.agent.db, {
        audience: session.agent.did(),
        subject: shared.did(),
        can: { 'store/add': [] },
      })
      assert.deepEqual(
        none,
        [],
        'claimed access has not been added to an agent'
      )
      yield* claim.save()

      const [auth] = Authorization.find(session.agent.db, {
        audience: session.agent.did(),
        subject: shared.did(),
        can: { 'store/add': [] },
      })

      assert.deepEqual(
        auth,
        Authorization.from({
          authority: session.agent.did(),
          subject: shared.did(),
          can: { 'store/add': [] },
          proofs: delegations,
        }),
        'claimed access has been added to an agent'
      )
    }),
}

Test.test({ Access: testAccess })
