import * as Account from '@web3-storage/access/capabilities/account'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context, test } from './helpers/context.js'

import { createAccount } from './helpers/utils.js'

test.before(async (t) => {
  t.context = await context()
})

test('should fail before registering account', async (t) => {
  const { issuer, service, conn } = t.context

  const inv = await Account.recoverValidation
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        email: 'mailto:hello@dag.house',
      },
    })
    .execute(conn)

  if (inv?.error) {
    t.deepEqual(
      inv.message,
      `service handler {can: "account/recover-validation"} error: No accounts found for email: hello@dag.house.`
    )
  } else {
    return t.fail()
  }
})

test('should return account/login', async (t) => {
  const { issuer, service, conn } = t.context

  await createAccount(issuer, service, conn, 'account-login@dag.house')

  const inv = await Account.recoverValidation
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        email: 'mailto:account-login@dag.house',
      },
    })
    .execute(conn)
  // eslint-disable-next-line no-console
  console.log('🚀 ~ file: account-recover.test.js ~ line 50 ~ test ~ inv', inv)

  if (!inv || inv.error) {
    return t.fail('failed to recover')
  }

  const del = await stringToDelegation(
    /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/capabilities/types').Any]>} */ (
      inv
    )
  )

  t.deepEqual(del.audience.did(), issuer.did())
  t.deepEqual(del.issuer.did(), service.did())
  t.deepEqual(del.capabilities[0].can, 'account/recover')
})
