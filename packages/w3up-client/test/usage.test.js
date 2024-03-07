import * as Test from './test.js'
import * as Result from '../src/result.js'

/**
 * @type {Test.Suite}
 */
export const testUsage = {
  'space.usage.report()': async (
    assert,
    { mail, session, grantAccess, plansStorage }
  ) => {
    // First we login to the workshop account
    const login = session.accounts.login({ email: 'alice@web.mail' })
    const message = await mail.take()
    await grantAccess(message)
    const account = Result.unwrap(await login)
    // Result.unwrap(await session.accounts.add(account))

    // Then we setup a billing for this account
    await plansStorage.set(account.did(), 'did:web:test.web3.storage')

    const space = Result.unwrap(await account.spaces.create({ name: 'home' }))

    const [plan] = Result.unwrap(await account.plans.list())
    Result.unwrap(await plan.subscriptions.add({ consumer: space.did() }))

    const period = { from: new Date(0), to: new Date(1709769229000) }

    const report = Result.unwrap(await space.usage.report(period))

    assert.deepEqual(report, {
      'did:web:test.web3.storage': {
        size: { final: 0, initial: 0 },
        space: space.did(),
        events: [],
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        },
        provider: 'did:web:test.web3.storage',
      },
    })

    const usage = Result.unwrap(await space.usage.get())
    assert.deepEqual(usage, 0n)
  },
}

Test.test({ Access: testUsage })
