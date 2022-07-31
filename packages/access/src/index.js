import * as UCAN from '@ipld/dag-ucan'
import fetch from '@web-std/fetch'
import pRetry from 'p-retry'
import { identityRegister, identityValidate } from './capabilities.js'
import { connection } from './connection.js'
import * as Service from './service.js'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Delegation } from '@ucanto/server'

/**
 *
 * @param {import("./types").ValidateOptions} opts
 */
export async function validate(opts) {
  const conn = connection({
    id: opts.issuer,
    url: opts.url || Service.url,
  })

  const validate = identityValidate.invoke({
    audience: opts.audience || Service.identity,
    issuer: opts.issuer,
    with: opts.issuer.did(),
    caveats: {
      ...opts.caveats,
    },
  })
  const out = await validate.execute(conn)

  if (out?.error) {
    throw out
  }
}

/**
 *
 * @param {import("./types").RegisterOptions} opts
 */
export async function register(opts) {
  const conn = connection({
    id: opts.issuer,
    url: opts.url || Service.url,
  })

  const validate = identityRegister.invoke({
    audience: opts.audience || Service.identity,
    issuer: opts.issuer,
    with: opts.proof.capabilities[0].with,
    caveats: {
      as: opts.proof.capabilities[0].as,
    },
    proofs: [opts.proof],
  })
  const out = await validate.execute(conn)

  if (out?.error) {
    throw out
  }
}

const run =
  (/** @type {string} */ did, /** @type {string} */ host) => async () => {
    const response = await fetch(`${host}validate?did=${did}`)

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    return response.text()
  }

/**
 * @param {import('./types').PullRegisterOptions} opts
 */
export async function pullRegisterDelegation(opts) {
  const url = opts.url || Service.url
  /** @type {Types.UCAN.JWT<import('./capabilities-types').IdentityRegister>} */
  const registerProof = await pRetry(run(opts.issuer.did(), url.toString()), {
    retries: 100,
  })

  const ucan = UCAN.parse(registerProof)
  const root = await UCAN.write(ucan)
  /** @type {Types.Delegation<[import('./capabilities-types').IdentityRegister]>} */
  const proof = Delegation.create({ root })

  return proof
}
