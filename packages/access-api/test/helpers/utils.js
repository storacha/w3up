/* eslint-disable unicorn/prefer-number-properties */
import * as UCAN from '@ipld/dag-ucan'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { StoreMemory } from '@web3-storage/access/stores/store-memory'
import * as Any from '@web3-storage/access/capabilities/any'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { stringToDelegation } from '@web3-storage/access/encoding'

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
 * @param {Types.Principal} service
 * @param {Types.ConnectionView<import('@web3-storage/access/types').Service>} conn
 * @param {string} email
 */
export async function createAccount(issuer, service, conn, email) {
  const store = new StoreMemory()
  const account = await store.createAccount()
  const claim = await Voucher.claim
    .invoke({
      issuer,
      audience: service,
      with: account.did(),
      nb: {
        // @ts-ignore
        identity: `mailto:${email}`,
        product: 'product:free',
        service: service.did(),
      },
      proofs: [
        await Any.any.delegate({
          issuer: account,
          audience: issuer,
          with: account.did(),
          expiration: Infinity,
        }),
      ],
    })
    .execute(conn)
  if (!claim || claim.error) {
    throw new Error('failed to create account')
  }

  const delegation = await stringToDelegation(claim)

  await Voucher.redeem
    .invoke({
      issuer,
      audience: service,
      with: service.did(),
      nb: {
        account: account.did(),
        identity: delegation.capabilities[0].nb.identity,
        product: delegation.capabilities[0].nb.product,
      },
      proofs: [
        delegation,
        await Any.any.delegate({
          issuer: account,
          audience: service,
          with: account.did(),
          expiration: Infinity,
        }),
      ],
    })
    .execute(conn)
}
