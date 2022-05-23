import { JSONResponse } from '../utils/responses.js'
import * as ucans from 'ucans'

// Capability semantics
/** @type {import('ucans').CapabilitySemantics<any>} */
const SEMANTICS = {
  // wether or not to use the default capability structure
  // (this would parse a regular capability into a custom one)
  tryParsing: (a) => a,

  // can a given child capability be delegated from a parent capability?
  tryDelegating: (parentCap, childCap) => {
    // eslint-disable-next-line unicorn/no-null
    if (childCap.with.scheme !== 'mailto') return null

    // we've got access to everything
    if (parentCap.with.hierPart === ucans.capability.superUser.SUPERUSER) {
      return childCap
    }

    // path must be the same or a path below
    if (childCap.with.hierPart.startsWith(parentCap.with.hierPart)) {
      return childCap
    }

    // 🚨 cannot delegate
    // eslint-disable-next-line unicorn/no-null
    return null
  },
}

/** @type {import("../utils/ucan-router").AbilityHandler} */
export async function access(input, ctx) {
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const result = ucans.hasCapability(
    SEMANTICS,
    {
      info: {
        originator: ctx.keypair.did(), // capability must have been originated from this issuer
        expiresAt: nowInSeconds, // ucan must not have been expired before this timestamp
        notBefore: nowInSeconds, // optional
      },
      capability: input.cap,
    },
    input.ucan
  )
  // eslint-disable-next-line no-console
  console.log('🚀 ~ file: access.js ~ line 42 ~ access ~ result', result)

  switch (input.segment) {
    case 'identify':
      return identify(input, ctx)
    default:
      throw new Error(
        `no support for segment ${input.segment} in namespace "access"`
      )
  }
}

/** @type {import("../utils/ucan-router").AbilityHandler} */
async function identify(input, ctx) {
  return new JSONResponse({ ok: true, value: input.segment })
}
