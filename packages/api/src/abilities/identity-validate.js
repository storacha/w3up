import { JSONResponse } from '../utils/responses.js'
import * as ucans from 'ucans'
import * as UCAN from '@ipld/dag-ucan'
import { checkCap } from './utils.js'

/**
 * @typedef {ucans.capability.EncodedCapability} CapabilityView
 */

/** @type {import("../utils/ucan-router").AbilityHandler} */
export function identityValidate(input, ctx) {
  // Capability semantics
  /** @type {ucans.CapabilitySemantics<CapabilityView>} */
  const SEMANTICS = {
    tryParsing: (a) => ucans.capability.encode(a),

    // can a given child capability be delegated from a parent capability?
    tryDelegating: (parentCap, childCap) => {
      return childCap
    },
  }

  const result = checkCap(SEMANTICS, input.ucan.issuer(), input.cap, input.ucan)

  return execute(result, ctx)
}

/**
 * identity/validate
 *
 * @param {ucans.CapabilityWithInfo<CapabilityView>} cap
 * @param {import('../utils/router.js').RouteContext} ctx
 * @returns Response | Promise<Response>
 */
async function execute(cap, ctx) {
  const ucan = await UCAN.issue({
    audience: { did: () => cap.info.originator },
    issuer: ctx.keypair,
    lifetimeInSeconds: 60 * 30,
    capabilities: [
      {
        with: cap.capability.with,
        can: 'identity/register',
      },
    ],
  })

  const jwt = UCAN.format(ucan)

  // For testing
  if (process.env.NODE_ENV === 'development') {
    return new JSONResponse({ ok: true, value: jwt })
  }

  await sendEmail({
    to: cap.capability.with.replace('mailto:', ''),
    ucan: UCAN.format(ucan),
  })

  return new JSONResponse({ ok: true })
}

/**
 * @param {{ to: string; ucan: string; }} opts
 */
async function sendEmail(opts) {
  const rsp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'text/json',
      'Content-Type': 'text/json',
      'X-Postmark-Server-Token': 'e0ab9531-b18d-4f2d-8b38-57252b9b1aa3',
    },
    body: JSON.stringify({
      From: 'noreply@dag.house',
      To: opts.to,
      Subject: 'Hello',
      HtmlBody: `<strong>Hello</strong> <br/> <a href="https://auth.storage/cb?cap=${opts.ucan}">click here</a><br/> ${opts.ucan}`,
      MessageStream: 'outbound',
    }),
  })
  const out = await rsp.json()

  if (out.Message !== 'OK') {
    throw new Error(JSON.stringify(out))
  }
}
