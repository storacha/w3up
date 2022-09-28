import { Delegation } from '@ucanto/core'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context, test } from './helpers/context.js'

test.before(async (t) => {
  t.context = await context()
})

test.only('should voucher/claim', async (t) => {
  const { issuer, service, conn } = t.context

  const inv = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      caveats: {
        identity: 'mailto:email@dag.house',
        product: 'product:free',
        service: service.did(),
      },
    })
    .execute(conn)

  if (inv.error) {
    return t.fail(inv?.message)
  }

  const delegation = await stringToDelegation(inv)

  t.deepEqual(delegation.issuer.did(), service.did())
  t.deepEqual(delegation.audience.did(), issuer.did())
  t.deepEqual(delegation.capabilities[0].account, issuer.did())
  t.deepEqual(delegation.capabilities[0].product, 'product:free')
  t.deepEqual(delegation.capabilities[0].identity, 'mailto:email@dag.house')

  if (Delegation.isDelegation(delegation.proofs[0])) {
    t.deepEqual(delegation.proofs[0].issuer.did(), service.did())
    t.deepEqual(delegation.proofs[0].capabilities, [
      {
        // TODO proof should have account
        account: service.did(),
        can: 'voucher/redeem',
        identity: 'mailto:*',
        product: 'product:*',
        with: service.did(),
      },
    ])
  } else {
    t.fail('proof should be a delegation')
  }
})
