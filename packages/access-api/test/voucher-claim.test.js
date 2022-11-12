import { Delegation } from '@ucanto/core'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { context, test } from './helpers/context.js'

test.before(async (t) => {
  t.context = await context()
})

test('should voucher/claim', async (t) => {
  const { issuer, service, conn } = t.context

  const inv = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: issuer.did(),
      nb: {
        identity: 'mailto:email@dag.house',
        product: service.did(),
      },
    })
    .execute(conn)

  if (!inv) {
    return t.fail('no output')
  }
  if (inv.error) {
    return t.fail(inv.message)
  }

  const delegation = await stringToDelegation(inv)

  t.deepEqual(delegation.issuer.did(), service.did())
  t.deepEqual(delegation.audience.did(), issuer.did())
  t.deepEqual(delegation.capabilities[0].nb.account, issuer.did())
  t.deepEqual(delegation.capabilities[0].with, service.did())
  t.deepEqual(delegation.capabilities[0].nb.identity, 'mailto:email@dag.house')

  if (Delegation.isDelegation(delegation.proofs[0])) {
    t.deepEqual(delegation.proofs[0].issuer.did(), service.did())
    t.deepEqual(delegation.proofs[0].capabilities, [
      {
        with: service.did(),
        can: 'voucher/redeem',
        nb: {
          identity: 'mailto:*',
        },
      },
    ])
  } else {
    t.fail('proof should be a delegation')
  }
})
