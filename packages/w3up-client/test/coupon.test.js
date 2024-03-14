import * as Test from './test.js'
import * as Coupon from '../src/coupon/coupon.js'
import * as Task from '../src/task.js'
import * as API from '../src/types.js'
import { parseLink } from '@ucanto/core'

import { alice } from './fixtures/principals.js'
/**
 * @type {Test.Suite}
 */
export const testCoupon = {
  'account.coupon': async (
    assert,
    { mail, session, grantAccess, plansStorage }
  ) => {
    const now = (Date.now() / 1000) | 0
    // First we login to the workshop account
    const login = session.accounts.login({ email: 'workshop@web3.storage' })
    const message = await mail.take()
    await grantAccess(message)
    const account = await login
    await session.accounts.add(account)

    // Then we setup a billing for this account
    await plansStorage.set(account.did(), 'did:web:test.web3.storage')

    // Then we use the account to issue a coupon for the workshop
    const issued = await Task.perform(
      Coupon.issue(session.agent, {
        subject: account.did(),
        can: {
          'plan/get': [],
          'provider/add': [],
        },
        expiration: now + 60 * 60 * 24,
      })
    )

    // We encode coupon and share it with the participants
    const archive = await issued.archive()

    const agent = await Task.perform(Coupon.open(archive))

    const coupon = await agent.connect(session.connection)
    const [...accounts] = coupon.accounts
    const [...spaces] = coupon.spaces

    assert.deepEqual(accounts.length, 1)
    assert.deepEqual(spaces.length, 0)

    const [redeemedAccount] = accounts

    assert.deepEqual(accounts[0].did(), account.did())

    const [plan] = await redeemedAccount.plans.list()

    const space = await coupon.spaces.create({ name: 'home' })
    await plan.subscriptions.add({ consumer: space.did() })

    assert.deepEqual(await space.info(), {
      did: space.did(),
      providers: ['did:web:test.web3.storage'],
    })
  },

  'saving a coupon': async (assert, { session, provisionsStorage }) =>
    Task.spawn(function* () {
      const now = (Date.now() / 1000) | 0
      const space = yield* session.spaces.create({ name: 'test' })
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
      const coupon = yield* Coupon.issue(space.agent, {
        subject: space.did(),
        can: { 'space/*': [] },
      })

      const [...none] = session.spaces
      assert.deepEqual([], none)

      const result = yield* session.coupons.add(coupon).result()
      assert.match(result.error?.message ?? '', /Coupon audience is/)

      const archive = yield* coupon.archive()

      const redeemed = yield* session.coupons.redeem(archive)

      yield* session.coupons.add(redeemed)

      const [one, ...rest] = session.spaces
      assert.deepEqual(rest.length, 0)
      assert.deepEqual(one.did(), space.did())

      const info = yield* one.info()

      assert.deepEqual(info, {
        did: space.did(),
        providers: ['did:web:test.web3.storage'],
      })
    }),

  'coupon with secret': async (assert, { session }) =>
    Task.spawn(function* () {
      const coupon = yield* session.coupons.issue({
        subject: session.agent.did(),
        can: {
          'store/list': [],
        },
        secret: 'secret',
      })

      const archive = yield* coupon.archive()

      const wrongPassword = yield* session.coupons
        .redeem(archive, { secret: 'wrong' })
        .result()

      assert.match(String(wrongPassword.error), /secret is invalid/)

      const requiresPassword = yield* session.coupons.redeem(archive).result()

      assert.match(String(requiresPassword.error), /requires a secret/)

      const redeem = yield* coupon.redeem(session)
    }),

  'corrupt coupon': async (assert, { session }) => {
    const result = await session.coupons
      .redeem(new Uint8Array(32).fill(1))
      .result()

    assert.match(String(result.error), /Invalid CAR header format/)
  },
}

Test.test({ Access: testCoupon })
