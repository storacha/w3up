import { provide, capability, Schema } from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'

/**
 * @template {Ucanto.Ability} A
 * @template {Ucanto.URI} R
 * @template {{}} O - handler success type
 * @template {{}} X - handler error type
 * @template {Ucanto.Caveats} [C={}]
 * @param {A} can - ucan can string
 * @param {object} o - options
 * @param {object} o.descriptor - ucan capability descriptor
 * @param {Ucanto.Reader<R, Ucanto.Resource, Ucanto.Failure>} o.descriptor.with - capability resource schema
 * @param {Schema.MapRepresentation<C, unknown>} o.descriptor.nb - capability nb schema
 * @param {(claim: {can:A, with: R, nb: C}, proof:{can:A, with:R, nb:C}) => Ucanto.Result<{}, Ucanto.Failure>} [o.descriptor.derives] - capability derives
 * @param {(input: import('@ucanto/server').ProviderInput<Ucanto.ParsedCapability<A,R,C>>) => Ucanto.Await<Ucanto.Result<O, X>>} o.invoke - handle invocation of capability 
 * @returns {Ucanto.ServiceMethod<Ucanto.Capability<A, R, C>, O, X>} - ucanto service method
 */
export function createMethod(can, o) {
  return provide(
    capability({ ...o.descriptor, can }),
    o.invoke,
  )
}
