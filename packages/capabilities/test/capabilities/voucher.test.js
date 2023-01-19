import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import { delegate } from '@ucanto/core'
import * as Voucher from '../../src/voucher.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'

describe('voucher capabilities', function () {
  it('should delegate from * to claim', async function () {
    const account = mallory
    const claim = Voucher.claim.invoke({
      issuer: alice,
      audience: service,
      with: account.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product: 'product:free',
        service: service.did(),
      },
      proofs: [
        await delegate({
          issuer: account,
          audience: alice,
          capabilities: [
            {
              can: 'voucher/*',
              with: account.did(),
            },
          ],
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
      authority: service,
    })
    if (!result.error) {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'voucher/claim')
      assert.deepEqual(result.capability.nb, {
        identity: 'mailto:alice@email.com',
        product: 'product:free',
        service: service.did(),
      })
    }
  })

  it('should delegate from claim to claim', async function () {
    const claim = Voucher.claim.invoke({
      issuer: bob,
      audience: service,
      with: alice.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product: 'product:free',
        service: service.did(),
      },
      proofs: [
        await Voucher.claim.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
          nb: {
            identity: 'mailto:alice@email.com',
            product: 'product:free',
            service: service.did(),
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.fail('should not error')
    } else {
      assert.deepEqual(result.audience.did(), service.did())
      assert.equal(result.capability.can, 'voucher/claim')
      assert.deepEqual(result.capability.nb, {
        identity: 'mailto:alice@email.com',
        product: 'product:free',
        service: service.did(),
      })
    }
  })

  it('should error claim to claim when caveats are different', async function () {
    const claim = Voucher.claim.invoke({
      issuer: bob,
      audience: service,
      with: alice.did(),
      nb: {
        identity: 'mailto:alice@email.com',
        product: 'product:freess',
        service: service.did(),
      },
      proofs: [
        await Voucher.claim.delegate({
          issuer: alice,
          audience: bob,
          with: alice.did(),
          nb: {
            identity: 'mailto:alice@email.com',
            product: 'product:free',
            service: service.did(),
          },
        }),
      ],
    })

    const result = await access(await claim.delegate(), {
      capability: Voucher.claim,
      principal: Verifier,
      authority: service,
    })

    if (result.error) {
      assert.ok(result.message.includes('- Can not derive'))
    } else {
      assert.fail('should error')
    }
  })
})
