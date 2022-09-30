import assert from 'assert'
import { access } from '@ucanto/validator'
import { Principal } from '@ucanto/principal'
import { delegate, parseLink } from '@ucanto/core'
import * as Store from '../../src/capabilities/store.js'
import {
  alice,
  service as w3,
  mallory as account,
} from '../helpers/fixtures.js'

describe('store capabilities', function () {
  const proof = delegate({
    issuer: account,
    audience: alice,
    capabilities: [
      {
        can: '*',
        with: account.did(),
      },
    ],
  })

  it('should be able to derive from *', async () => {
    const add = Store.add.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      caveats: {
        link: parseLink('bafkqaaa'),
      },
      proofs: [await proof],
    })

    const result = await access(await add.delegate(), {
      capability: Store.add,
      principal: Principal,
      canIssue: (claim, issuer) => {
        return claim.with === issuer
      },
    })

    if (result.error) {
      assert.fail(result.message)
    }

    assert.deepEqual(result.audience.did(), w3.did())
    assert.equal(result.capability.can, 'store/add')
    assert.deepEqual(result.capability.caveats, {
      link: parseLink('bafkqaaa'),
    })
  })
})
