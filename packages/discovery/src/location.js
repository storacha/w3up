import { Schema } from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'
import { createMethod } from './ucanto-utils.js'

export const descriptor = {
  with: Schema.did(),
  nb: Schema.struct({}),
}

// eslint-disable-next-line jsdoc/require-returns
/**
 * create a descriptor
 * 
 * @param {object} options - options
 * @param {Ucanto.Ability} options.can - capability name
 */
export function describe({ can }) {
  return {
    ...descriptor,
    can,
  }
}

export const invoke = async () => {
  return {
    ok: {
      message: 'assert location invoked ok'
    },
  }
}

// eslint-disable-next-line jsdoc/require-returns
/**
 * @param {object} o - options
 * @param {Ucanto.Ability} o.can - capabilty name
 */
export function method({ can }) {
  return createMethod(can, { descriptor, invoke })
}

export default {
  descriptor,
  invoke,
  method,
}
