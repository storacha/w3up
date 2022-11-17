import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import { delegate } from '@ucanto/core'
import * as Voucher from '../../src/capabilities/voucher.js'
import {
  alice,
  bob,
  service as w3,
  mallory as space,
} from '../helpers/fixtures.js'

const product = `did:key:zFreeTier`

describe('voucher capabilities', function () {
  it('should delegate from * to claim', async function () {
    const claim = Voucher.claim.invoke({
      issuer: alice,
      audience: w3,
      with: space.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product,
      },
      proofs: [
        await delegate({
          issuer: space,
          audience: alice,
          capabilities: [
            {
              can: 'voucher/*',
              with: space.did(),
            },
          ],
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
    })
    if (!result.error) {
      assert.deepEqual(result.audience.did(), w3.did())
      assert.equal(result.capability.can, 'voucher/claim')
      assert.deepEqual(result.capability.nb, {
        identity: 'mailto:alice@email.com',
        product,
      })
    }
  })

  it('should delegate from claim to claim', async function () {
    const claim = Voucher.claim.invoke({
      issuer: bob,
      audience: w3,
      with: alice.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product,
      },
      proofs: [
        await Voucher.claim.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
          nb: {
            identity: 'mailto:alice@email.com',
            product,
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
    })

    if (!result.error) {
      assert.deepEqual(result.audience.did(), w3.did())
      assert.equal(result.capability.can, 'voucher/claim')
      assert.deepEqual(result.capability.nb, {
        identity: 'mailto:alice@email.com',
        product,
      })
    } else {
      assert.fail('should not error')
    }
  })

  it('should error claim to claim when caveats are different', async function () {
    const claim = Voucher.claim.invoke({
      issuer: bob,
      audience: w3,
      with: alice.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product: 'did:key:freess',
      },
      proofs: [
        await Voucher.claim.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
          nb: {
            identity: 'mailto:alice@email.com',
            product: 'did:key:free',
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
    })

    if (result.error) {
      assert.ok(result.message.includes('- Can not derive'))
    } else {
      assert.fail('should error')
    }
  })
})
