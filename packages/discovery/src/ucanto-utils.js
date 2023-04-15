import { provide, capability } from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'

/**
 * @template {Ucanto.Ability} A
 * @template {Ucanto.URI} R
 * @template {{}} O - handler success type
 * @template {{}} X - handler error type
 * @template {Ucanto.Caveats} [C={}]
 * @param {A} can - ucan can string
 * @param {object} o - options
 * @param {import('./types').CapabilityDescriptor<A,R,C>} o.descriptor - ucan capability descriptor
 * @param {import('./types').CapabilityServiceMethod<A,R,C,O,X>} o.invoke - handle invocation of capability
 * @returns {Ucanto.ServiceMethod<Ucanto.Capability<A, R, C>, O, X>} - ucanto service method
 */
export function createMethod(can, o) {
  return provide(capability({ ...o.descriptor, can }), o.invoke)
}
