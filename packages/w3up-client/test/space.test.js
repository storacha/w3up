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
    Task.spawn(function* () {
      const spaces = Space.view(session)
      const none = spaces.list()
      assert.deepEqual(none, {})

      const space = yield* spaces.create({ name: 'my-space' })
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

      const info = yield* space.info()

      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })

      assert.deepEqual(spaces.list(), {}, 'space was not saved')

      const sharedSpace = yield* space.share({ audience: session.agent.signer })

      yield* spaces.add(sharedSpace)

      assert.deepEqual(
        spaces.list(),
        {
          [space.did()]: sharedSpace,
        },
        'space was saved'
      )

      const saved = spaces.list()[space.did()]
      const status = yield* saved.info()

      assert.deepEqual(status, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })
    }),
  'should get usage': async (
    assert,
    { session, grantAccess, mail, plansStorage }
  ) =>
    Task.spawn(function* () {
      const product = 'did:web:test.web3.storage'
      const space = yield* session.spaces.create({ name: 'test' })

      const email = 'alice@web.mail'
      const login = session.accounts.login({ email })

      const message = yield* Task.wait(mail.take())
      assert.deepEqual(message.to, email)
      yield* Task.wait(grantAccess(message))

      const account = yield* login

      // setup billing plan
      yield* Task.ok.wait(plansStorage.set(account.did(), product))

      const plans = yield* account.plans.list()
      const [plan] = Object.values(plans)

      yield* plan.subscriptions.add({ consumer: space.did() })

      const shared = yield* space.share({ audience: session.agent.signer })
      yield* session.spaces.add(shared)

      const [saved] = session.spaces
      assert.deepEqual(saved.did(), space.did())

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
    Task.spawn(function* () {
      const product = 'did:web:test.web3.storage'
      const email = 'alice@web.mail'
      yield* Task.ok.wait(
        plansStorage.set(Account.DIDMailto.fromEmail(email), product)
      )

      const login = Account.login(session, { email })
      const message = yield* Task.wait(mail.take())

      yield* Task.wait(grantAccess(message))
      const alice = yield* login

      const plans = yield* alice.plans.list()
      const [plan] = Object.values(plans)

      assert.equal(plan.customer, alice.did())
      assert.equal(plan.provider, session.connection.id.did())

      const space = yield* Space.create({ name: 'test-space' })

      yield* plan.subscriptions.add({ consumer: space.did() })

      const info = yield* space.connect(session.connection).info()
      assert.deepEqual(info, {
        did: space.did(),
        providers: [session.connection.id.did()],
      })
    }),
}

Test.test({ Space: testSpace })
