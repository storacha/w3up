/* eslint-disable jsdoc/check-param-names */
/**
 * @file
 * claim action invocation handling
 */
import { Schema } from '@ucanto/server'
import { literal } from '@ucanto/validator'

export const descriptor = {
  with: Schema.did(),
  nb: Schema.struct({
    type: literal('location').or(literal('inclusion')).or(literal('partition')),
  }),
}

// eslint-disable-next-line jsdoc/require-param-description
/**
 * @param {object} o - options
 * @param {object} o.capability - capability being invoked
 * @param {object} o.capability.nb - params
 * @param {import('./types').DiscoveryAssertion} o.capability.nb.type - type of claim
 * @returns {Promise<{ ok: { type: import('./types').DiscoveryAssertion } }>} - echos back nb.type
 */
export const invoke = async function ({ capability }) {
  return {
    ok: {
      type: capability.nb.type,
    },
  }
}

export default {
  descriptor,
  invoke,
}
