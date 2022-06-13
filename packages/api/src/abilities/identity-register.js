import { JSONResponse } from '../utils/responses.js'
import * as ucans from 'ucans'
import { checkCap } from './utils.js'
import { Accounts } from '../kvs/accounts.js'

/**
 * @typedef {ucans.capability.Capability} Capability
 */

/** @type {import("../utils/ucan-router").AbilityHandler} */
export function identityRegister(input, ctx) {
  // Capability semantics
  /** @type {ucans.CapabilitySemantics<Capability>} */
  const SEMANTICS = {
    tryParsing: (a) => a,

    // can a given child capability be delegated from a parent capability?
    tryDelegating: (parentCap, childCap) => {
      return childCap
    },
  }

  const result = checkCap(SEMANTICS, ctx.keypair.did(), input.cap, input.ucan)

  return execute(input.ucan, result, ctx)
}

/**
 * identity/validate
 *
 * @param {ucans.Chained} ucan
 * @param {ucans.CapabilityWithInfo<Capability>} cap
 * @param {import('../utils/router.js').RouteContext} ctx
 * @returns Response | Promise<Response>
 */
async function execute(ucan, cap, ctx) {
  const accounts = new Accounts()

  await accounts.register(
    ucan.issuer(),
    ucans.capability.resourcePointer.encode(cap.capability.with),
    // @ts-ignore
    ucan._encoded
  )
  return new JSONResponse({ ok: true })
}
