# Service definitions

This doc collects RPC interface definitions for the `w3-protocol` services.

## What is a Service?

We're using [ucanto](https://github.com/web3-storage/ucanto) to model services as a collection of related capabilities, which can be "invoked" by a user agent to perform some action and/or make a request.

Capabilites are defined in terms of **abilities** and **resources**. 

The **ability** is a string identifying some "verb," or action that can be performed. Ability strings have a format of `namespace/action`, for example, `account/info`.

A **resource** is something that can be acted upon, identified by a URI. In w3-protocol services, many of the resource URIs will be `did:` URIs that identify a user account. 

A `ucanto` service takes in a stream of "invocations," which you can think of as serialized RPC requests that are encoded as UCANs and signed by the caller. An invocation must contain a proof that the capability being invoked has been delegated to the caller.

A `ucanto` service uses the ability string to dispatch an invocation to the correct "capability provider" function, which executes some logic and (optionally) returns some result to the caller.

A capability invocation can contain "parameters", which are encoded into the UCAN's "caveats" (`nb` field in the JWT form).

TODO: clarify that delegations with caveats act as constraints (see https://www.notion.so/Protocol-Specifications-aa31a64a587c4d02bfacac144d155783)

## Accounts service

### `account/info`

### `account/recover`

### `account/recover-validation`


## Storage service

