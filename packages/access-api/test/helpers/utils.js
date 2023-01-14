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
 * @param {Types.Principal<UCAN.DID>} service
 * @param {Types.ConnectionView<import('@web3-storage/access/types').Service>} conn
 * @param {string} email
 */
export async function createSpace(issuer, service, conn, email) {
  const space = await Signer.generate()
  const spaceDelegation = await Voucher.top.delegate({
    issuer: space,
    audience: issuer,
    with: space.did(),
    expiration: Infinity,
  })
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
      proofs: [spaceDelegation],
    })
    .execute(conn)
  if (!claim || claim.error) {
    throw new Error('failed to create space', { cause: claim })
  }

  const delegation = stringToDelegation(claim)
  const serviceDelegation = await Voucher.top.delegate({
    issuer: space,
    audience: service,
    with: space.did(),
    expiration: Infinity,
  })
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
      facts: [
        {
          space: {
            name: `name-${email}`,
          },
          agent: {
            name: 'testing-agent',
            type: 'device',
            description: 'testing',
            url: 'https://dag.house',
            image: 'https://dag.house/logo.jpg',
          },
        },
      ],

      proofs: [delegation, serviceDelegation],
    })
    .execute(conn)

  if (redeem?.error) {
    // eslint-disable-next-line no-console
    console.log('create space util error', redeem)
    throw new Error(redeem.message)
  }

  return {
    space,
    delegation: spaceDelegation,
  }
}

/**
 * Return whether the provided stack trace string appears to be generated
 * by a deployed upload-api.
 * Heuristics:
 * * stack trace files paths will start with `file:///var/task/upload-api` because of how the lambda environment is working
 *
 * @param {string} stack
 */
export function isUploadApiStack(stack) {
  return stack.includes('file:///var/task/upload-api')
}
