import {
  InferInvokedCapability,
  Match,
  ParsedCapability,
  RequestDecoder,
  RequestEncoder,
  ResponseDecoder,
  ResponseEncoder,
  ServiceMethod,
  TheCapabilityParser,
} from '@ucanto/interface'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export interface ServerCodec extends RequestDecoder, ResponseEncoder {}

/**
 * Select from T the property names whose values are of type V
 */
export type KeysWithValue<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

/**
 * Infer ucanto service object from a namespace object containing CapabilityParsers
 *
 * @example InferService<import('@web3-storage/capabilities/upload')>
 */
export type InferService<
  S extends Record<string, unknown>,
  CP extends TheCapabilityParser<Match<ParsedCapability>> = TheCapabilityParser<
    Match<ParsedCapability>
  >,
  Success = any
> = {
  [K in KeysWithValue<S, CP>]: ServiceMethod<
    InferInvokedCapability<S[K] extends CP ? S[K] : never>,
    Success,
    { error: true }
  >
}
