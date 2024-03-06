import * as Test from './test.js'
import * as Result from '../src/result.js'
import * as Coupon from '../src/coupon.js'
import * as Agent from '../src/agent.js'

import { alice } from './fixtures/principals.js'
/**
 * @type {Test.Suite}
 */
export const testCoupon = {
  'only account.coupon': async (
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

  'coupon with password': async (
    assert,
    { client, mail, connect, grantAccess, plansStorage }
  ) => {
    const coupon = await client.coupon.issue({
      capabilities: [
        {
          with: client.did(),
          can: 'store/list',
        },
      ],
      password: 'secret',
    })

    const archive = Result.unwrap(await coupon.archive())

    const wrongPassword = await client.coupon
      .redeem(archive, { password: 'wrong' })
      .catch((e) => e)

    assert.match(String(wrongPassword), /password is invalid/)

    const requiresPassword = await client.coupon.redeem(archive).catch((e) => e)

    assert.match(String(requiresPassword), /requires a password/)

    const redeem = await coupon.redeem(client.agent, { password: 'secret' })
    assert.ok(redeem.ok)
  },

  'corrupt coupon': async (assert, { client, mail, connect, grantAccess }) => {
    const fail = await client.coupon
      .redeem(new Uint8Array(32).fill(1))
      .catch((e) => e)

    assert.match(fail.message, /Invalid CAR header format/)
  },
}

Test.test({ Access: testCoupon })
