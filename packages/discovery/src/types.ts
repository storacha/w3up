/* eslint-disable @typescript-eslint/ban-types */
import * as Server from '@ucanto/server'

export type AssertLocationCapability = Server.API.Capability<
  "discovery/assert/location",
  Server.API.DID,
  Server.Schema.InferStruct<{}>
>
export type AssertLocationSuccess = {}
export type AssertLocationError = {}
export type AssertLocationMethod = Server.ServiceMethod<
  AssertLocationCapability,
  AssertLocationSuccess,
  AssertLocationError
>

export type ContentDiscoveryService = {
  discovery: {
    assert: {
      location: AssertLocationMethod
    }
  }
}
