import * as Test from '../test.js'
import * as Account from '../../src/account.js'
import * as Result from '../../src/result.js'

/**
 *
 * @param {*} client
 * @param {import('@web3-storage/upload-api').DebugEmail} mail
 * @param {(email: {url: string | URL}) => Promise<void>} grantAccess
 */
async function initializeAccount(client, mail, grantAccess) {
  const email = 'alice@web.mail'
  const login = Account.login(client, email)
  const message = await mail.take()
  await grantAccess(message)
  const account = Result.try(await login)
  await account.save()
  return account
}

export const PlanClient = Test.withContext({
  get: {
    'should get a plan': async (
      assert,
      { client, plansStorage, grantAccess, mail }
    ) => {
      const account = await initializeAccount(client, mail, grantAccess)

      await assert.rejects(client.capability.plan.get(account.did()))

      const exampleProduct = 'did:web:example.com'
      Result.try(
        await plansStorage.initialize(
          account.did(),
          'stripe:123xyz',
          exampleProduct
        )
      )

      const res = await client.capability.plan.get(account.did(), {
        nonce: 'retry',
      })

      assert.equal(res.product, exampleProduct)
      assert.ok(res.updatedAt)

      await assert.rejects(
        client.capability.plan.get('did:mailto:example.com:notauser')
      )
    },
  },

  set: {
    'should set a plan': async (
      assert,
      { client, plansStorage, grantAccess, mail }
    ) => {
      const account = await initializeAccount(client, mail, grantAccess)

      const initialProduct = 'did:web:example.com'
      const updatedProduct = 'did:web:example.com:updated'

      await assert.rejects(
        client.capability.plan.set(account.did(), updatedProduct)
      )

      Result.try(
        await plansStorage.initialize(
          account.did(),
          'stripe:123xyz',
          initialProduct
        )
      )
      assert.equal(
        (await client.capability.plan.get(account.did())).product,
        initialProduct
      )
      assert.ok(
        await client.capability.plan.set(account.did(), updatedProduct, {
          nonce: '2',
        })
      )
      assert.equal(
        (await client.capability.plan.get(account.did(), { nonce: '2' }))
          .product,
        updatedProduct
      )

      await assert.rejects(
        client.capability.plan.set(
          'did:mailto:example.com:notauser',
          initialProduct,
          { nonce: '3' }
        )
      )
    },
  },

  createAdminSession: {
    'should create an admin session': async (
      assert,
      { client, plansStorage, grantAccess, mail }
    ) => {
      const account = await initializeAccount(client, mail, grantAccess)

      await assert.rejects(
        client.capability.plan.createAdminSession(
          account.did(),
          'https://example.com/return-url'
        )
      )

      const initialProduct = 'did:web:example.com'
      Result.try(
        await plansStorage.initialize(
          account.did(),
          'stripe:123xyz',
          initialProduct
        )
      )

      const session = await client.capability.plan.createAdminSession(
        account.did(),
        'https://example.com/return-url',
        { nonce: '2' }
      )
      assert.ok(session.url)

      await assert.rejects(
        client.capability.plan.createAdminSession(
          'did:mailto:example.com:notauser',
          'https://example.com/return-url',
          { nonce: '3' }
        )
      )
    },
  },
})

Test.test({ PlanClient })
