/* eslint-disable @typescript-eslint/ban-types */
import * as Server from '@ucanto/server'
import type * as Ucanto from '@ucanto/interface'

export type NoopCapability<Ability extends Ucanto.Ability> =
  Server.API.Capability<Ability, Server.API.DID, Server.Schema.InferStruct<{}>>

export type NoopSuccess = {}
export type NoopError = {}
export type NoopMethod<Ability extends Ucanto.Ability> = Server.ServiceMethod<
  NoopCapability<Ability>,
  NoopSuccess,
  NoopError
>

export type DiscoveryAssertion = 'inclusion' | 'location' | 'partition'

export type ContentDiscoveryService = {
  discovery: {
    assert: {
      [A in DiscoveryAssertion]: NoopMethod<`discovery/assert/${A}`>
    }
  }
}

/**
 * similar to `Descriptor` in ucanto source code, which isn't exported
 */
export type CapabilityDescriptor<
  A extends Ucanto.Ability,
  R extends Ucanto.Resource,
  C extends Ucanto.Caveats = {}
> = {
  derives?: (
    claim: { can: A; with: R; nb: C },
    proof: { can: A; with: R; nb: C }
  ) => Ucanto.Result<{}, Ucanto.Failure>
  nb: Server.Schema.MapRepresentation<C, unknown>
  with: Ucanto.Reader<R, Ucanto.Resource, Ucanto.Failure>
}

/**
 * function that handles a capability invocation
 */
export type CapabilityServiceMethod<
  A extends Ucanto.Ability,
  R extends Ucanto.Resource,
  C extends Ucanto.Caveats,
  O extends {},
  X extends {}
> = (
  input: import('@ucanto/server').ProviderInput<
    Ucanto.ParsedCapability<A, R, C>
  >
) => Ucanto.Await<Ucanto.Result<O, X>>
