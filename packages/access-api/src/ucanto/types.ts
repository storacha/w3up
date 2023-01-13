import {
  Capability,
  InferInvokedCapability,
  Invocation,
  InvocationContext,
  Match,
  ParsedCapability,
  RequestDecoder,
  RequestEncoder,
  ResponseDecoder,
  ResponseEncoder,
  Result,
  TheCapabilityParser,
} from '@ucanto/interface'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export interface ServerCodec extends RequestDecoder, ResponseEncoder {}

/**
 * A single ucanto service method.
 */
export type InvocationResponder<
  C extends Capability,
  Success = unknown,
  Failure extends { error: true } = { error: true }
> = (
  invocation: Invocation<C>,
  context: InvocationContext
) => Promise<Result<Success, Failure>>

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
  >
> = {
  [K in KeysWithValue<S, CP>]: InvocationResponder<
    InferInvokedCapability<S[K] extends CP ? S[K] : never>
  >
}
