/* eslint-disable unicorn/prefer-number-properties */
import * as UCAN from '@ipld/dag-ucan'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'
import { Signer } from '@ucanto/principal/ed25519'

/**
 * @param {Types.UCAN.View} ucan
 * @param {import('miniflare').Miniflare} mf
 */
export async function send(ucan, mf) {
  return mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UCAN.format(ucan)}`,
    },
  })
}

/**
 * @param {Types.Signer} issuer
 * @param {Types.Principal<"key">} service
 * @param {Types.ConnectionView<import('@web3-storage/access/types').Service>} conn
 * @param {string} email
 */
export async function createSpace(issuer, service, conn, email) {
  const space = await Signer.generate()
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: space.did(),
      nb: {
        // @ts-ignore
        identity: `mailto:${email}`,
        product: 'product:free',
        service: service.did(),
      },
      proofs: [
        await Voucher.top.delegate({
          issuer: space,
          audience: issuer,
          with: space.did(),
          expiration: Infinity,
        }),
      ],
    })
    .execute(conn)
  if (!claim || claim.error) {
    throw new Error('failed to create space')
  }

  const delegation = await stringToDelegation(claim)

  const redeem = await Voucher.redeem
    .invoke({
      issuer,
      audience: service,
      with: service.did(),
      nb: {
        space: space.did(),
        identity: delegation.capabilities[0].nb.identity,
        product: delegation.capabilities[0].nb.product,
      },
      proofs: [
        delegation,
        await Voucher.top.delegate({
          issuer: space,
          audience: service,
          with: space.did(),
          expiration: Infinity,
        }),
      ],
    })
    .execute(conn)

  if (redeem?.error) {
    // eslint-disable-next-line no-console
    console.log(redeem)
    throw new Error(redeem.message)
  }

  return {
    space,
  }
}
