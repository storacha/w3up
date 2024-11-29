import * as Test from './test.js'
import * as Result from '../src/result.js'

/**
 * @type {Test.Suite}
 */
export const testCoupon = Test.withContext({
  'account.coupon': async (
    assert,
    { client, mail, connect, grantAccess, plansStorage }
  ) => {
    // First we login to the workshop account
    const login = client.login('workshop@web3.storage')
    const message = await mail.take()
    await grantAccess(message)
    const account = await login

    // Then we setup a billing for this account
    await plansStorage.set(account.did(), 'did:web:test.web3.storage')

    // Then we use the account to issue a coupon for the workshop
    const coupon = await client.coupon.issue({
      capabilities: [
        {
          with: account.did(),
          can: 'provider/add',
        },
      ],
      lifetimeInSeconds: 60 * 60 * 24,
    })

    // We encode coupon and share it with the participants
    const archive = Result.unwrap(await coupon.archive())

    // alice join the workshop and redeem the coupon
    const alice = await connect()
    const access = await alice.coupon.redeem(archive)

    // creates a space and provision it with redeemed coupon
    const space = await alice.createSpace('home', {
      skipContentServeAuthorization: true,
    })
    const result = await space.provision(access)
    await space.save()

    assert.ok(result.ok)

    const info = await alice.capability.space.info(space.did())
    assert.deepEqual(info.did, space.did())
    assert.deepEqual(info.providers, ['did:web:test.web3.storage'])
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
})

Test.test({ Access: testCoupon })
