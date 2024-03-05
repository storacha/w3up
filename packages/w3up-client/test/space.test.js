import * as Signer from '@ucanto/principal/ed25519'
import * as Test from './test.js'
import * as Space from '../src/space.js'
import * as Account from '../src/account.js'
import * as Result from '../src/result.js'
import { randomCAR } from './helpers/random.js'
import { parseLink } from '@ucanto/core'
import * as Task from '../src/task.js'
import * as API from '../src/types.js'

/**
 * @type {Test.Suite}
 */
export const testSpace = {
  'create a new space': (assert, { session, provisionsStorage }) =>
    Task.perform(function* () {
      const spaces = Space.view(session)
      const none = spaces.list()
      assert.deepEqual(none, {})

      const space = yield* Task.join(spaces.create({ name: 'my-space' }))
      assert.equal(space.name, 'my-space')

      // Provision space so the API can be used.
      yield* Task.wait(
        provisionsStorage.put({
          provider: /** @type {API.ProviderDID} */ (
            session.connection.id.did()
          ),
          customer: 'did:mailto:web.mail:alice',
          consumer: space.did(),
          cause: parseLink('bafkqaaa'),
        })
      )

      const info = yield* Task.join(space.info())

      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      assert.deepEqual(spaces.list(), {}, 'space was not saved')

      const sharedSpace = yield* Task.join(space.share(session.agent.signer))

      yield* Task.join(spaces.add(sharedSpace))

      assert.deepEqual(
        spaces.list(),
        {
          [space.did()]: sharedSpace,
        },
        'space was saved'
      )

      const saved = spaces.list()[space.did()]
      const status = yield* Task.join(saved.info())

      assert.deepEqual(status, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      return { ok: {} }
    }),
  'should get usage': async (
    assert,
    { session, grantAccess, mail, plansStorage }
  ) =>
    Task.perform(function* () {
      const product = 'did:web:test.web3.storage'
      const space = yield* Task.join(session.spaces.create({ name: 'test' }))

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })

      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))

      const account = yield* Task.join(login)

      // setup billing plan
      yield* Task.join(plansStorage.set(account.did(), product))

      const plans = yield* Task.join(account.plans.list())
      const [plan] = Object.values(plans)

      yield* Task.join(plan.subscriptions.add({ consumer: space.did() }))

      const shared = yield* Task.join(space.share(session.agent.signer))
      yield* Task.join(session.spaces.add(shared))

      const [saved] = session.spaces
      assert.deepEqual(saved.did(), space.did())

      return { ok: {} }

      // const size = 1138
      // const archive = await randomCAR(size)
      // await client.agent.invokeAndExecute(StoreCapabilities.add, {
      //   nb: {
      //     link: archive.cid,
      //     size,
      //   },
      // })
      // const found = client.spaces().find((s) => s.did() === space.did())
      // if (!found) return assert.fail('space not found')
      // const usage = Result.unwrap(await found.usage.get())
      // assert.equal(usage, BigInt(size))
    }),

  'get space info': async (
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

      const space = yield* Task.join(Space.create({ name: 'test-space' }))

      yield* Task.join(plan.subscriptions.add({ consumer: space.did() }))

      const info = yield* Task.join(space.connect(session.connection).info())
      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      return { ok: {} }
    }),
}

Test.test({ Space: testSpace })
