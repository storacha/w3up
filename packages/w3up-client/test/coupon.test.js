import * as Test from './test.js'
import * as Result from '../src/result.js'
import * as Coupon from '../src/coupon.js'
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
    const account = Result.unwrap(await login)
    Result.unwrap(await session.accounts.add(account))

    // Then we setup a billing for this account
    await plansStorage.set(account.did(), 'did:web:test.web3.storage')

    // Then we use the account to issue a coupon for the workshop
    const issued = Result.unwrap(
      await Coupon.issue(session.agent, {
        subject: account.did(),
        can: {
          'plan/get': [],
          'provider/add': [],
        },
        expiration: now + 60 * 60 * 24,
      })
    )

    // We encode coupon and share it with the participants
    const archive = Result.unwrap(await issued.archive())

    const agent = Result.unwrap(await Coupon.open(archive))

    const coupon = agent.connect(session.connection)
    const [...accounts] = coupon.accounts
    const [...spaces] = coupon.spaces

    assert.deepEqual(accounts.length, 1)
    assert.deepEqual(spaces.length, 0)

    const [redeemedAccount] = accounts

    assert.deepEqual(accounts[0].did(), account.did())

    const [plan] = Result.unwrap(await redeemedAccount.plans.list())

    const space = Result.unwrap(await coupon.spaces.create({ name: 'home' }))
    Result.unwrap(await plan.subscriptions.add({ consumer: space.did() }))

    assert.deepEqual(Result.unwrap(await space.info()), {
      did: space.did(),
      providers: ['did:web:test.web3.storage'],
    })
  },

  'saving a coupon': async (assert, { session, provisionsStorage }) =>
    Task.perform(function* () {
      const now = (Date.now() / 1000) | 0
      const space = yield* Task.join(session.spaces.create({ name: 'test' }))
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
      const coupon = yield* Task.join(
        Coupon.issue(space.agent, {
          subject: space.did(),
          can: { 'space/*': [] },
        })
      )

      const [...none] = session.spaces
      assert.deepEqual([], none)

      const result = yield* Task.wait(session.coupons.add(coupon))
      assert.match(result.error?.message ?? '', /Coupon audience is/)

      const archive = yield* Task.join(coupon.archive())

      const redeemed = yield* Task.join(session.coupons.redeem(archive))

      yield* Task.join(session.coupons.add(redeemed))

      const [one, ...rest] = session.spaces
      assert.deepEqual(rest.length, 0)
      assert.deepEqual(one.did(), space.did())

      const info = yield* Task.join(one.info())

      assert.deepEqual(info, {
        did: space.did(),
        providers: ['did:web:test.web3.storage'],
      })

      return { ok: {} }
    }),

  'coupon with secret': async (assert, { session }) =>
    Task.perform(function* () {
      const coupon = yield* Task.join(
        session.coupons.issue({
          subject: session.agent.did(),
          can: {
            'store/list': [],
          },
          secret: 'secret',
        })
      )

      const archive = yield* Task.join(coupon.archive())

      const wrongPassword = yield* Task.wait(
        session.coupons.redeem(archive, { secret: 'wrong' })
      )

      assert.match(String(wrongPassword.error), /secret is invalid/)

      const requiresPassword = yield* Task.wait(session.coupons.redeem(archive))

      assert.match(String(requiresPassword.error), /requires a secret/)

      const redeem = yield* Task.join(
        coupon.redeem(session, { secret: 'secret' })
      )
      assert.ok(redeem)

      return { ok: {} }
    }),

  'corrupt coupon': async (assert, { session }) => {
    const result = await session.coupons.redeem(new Uint8Array(32).fill(1))

    assert.match(String(result.error), /Invalid CAR header format/)
  },
}

Test.test({ Access: testCoupon })
