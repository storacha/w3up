import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/access/capabilities/store'
import { serviceSigner } from './fixtures.js'
import { findCapability } from '../src/utils.js'

describe('findCapability', () => {
  it('throws when capability is not found', () => {
    assert.throws(() => findCapability([], 'store/add'), {
      message: 'Missing proof of delegated capability "store/add"',
    })
  })

  it('throws for mismatched audience', async () => {
    const issuer = await Signer.generate()
    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer,
        audience: serviceSigner,
        with: issuer.did(),
        expiration: Infinity,
      }),
    ]

    // we match on `audience`. Passing in the issuer or any other DID here should fail.
    assert.throws(() => findCapability(proofs, 'store/add', issuer.did()), {
      message: `Missing proof of delegated capability "store/add" for audience "${issuer.did()}"`,
    })
  })

  it('matches wildcard capability', async () => {
    const issuer = await Signer.generate()
    const proofs = [
      await StoreCapabilities.store.delegate({
        issuer,
        audience: serviceSigner,
        with: issuer.did(),
        expiration: Infinity,
      }),
    ]

    const cap = findCapability(proofs, 'store/add')
    assert.equal(cap.can, 'store/*')
  })

  it('ignores non-delegation proofs', async () => {
    const issuer = await Signer.generate()
    const delegation = await StoreCapabilities.store.delegate({
      issuer,
      audience: serviceSigner,
      with: issuer.did(),
      expiration: Infinity,
    })
    const proofs = [delegation.cid]

    assert.throws(() => findCapability(proofs, 'store/add'), {
      message: 'Missing proof of delegated capability "store/add"',
    })
  })
})
