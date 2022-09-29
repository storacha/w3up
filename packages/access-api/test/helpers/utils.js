import * as UCAN from '@ipld/dag-ucan'
import { Delegation } from '@ucanto/core'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import * as Identity from '@web3-storage/access/capabilities/identity'

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
 * @param {Types.ConnectionView<import('@web3-storage/access/src/types').Service>} con
 * @param {Types.Signer} issuer
 * @param {Types.Principal} audience
 * @param {string} email
 */
export async function validateEmail(con, issuer, audience, email) {
  const validate = Identity.validate.invoke({
    audience,
    issuer,
    nb: {
      as: `mailto:${email}`,
    },
    with: issuer.did(),
  })

  const out = await validate.execute(con)
  if (out?.error) {
    throw out
  }
  // @ts-ignore
  const ucan = UCAN.parse(
    // @ts-ignore
    out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  )
  const root = await UCAN.write(ucan)
  const proof = Delegation.create({ root })

  return proof
}

/**
 * @param {Types.ConnectionView<import('@web3-storage/access/src/types').Service>} con
 * @param {Types.Signer} issuer
 * @param {Types.Principal} audience
 * @param {Types.Delegation<[import('@web3-storage/access/src/types').IdentityRegister]>} proof
 */
export async function register(con, issuer, audience, proof) {
  const register = Identity.register.invoke({
    audience,
    issuer,
    with: proof.capabilities[0].with,
    nb: {
      as: proof.capabilities[0].nb.as,
    },
    proofs: [proof],
  })

  await register.execute(con)
}
