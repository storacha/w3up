# Service definitions

This doc collects RPC interface definitions for the `w3-protocol` services.

See [capabilities.md](./capabilities.md) for details about each of the capablities defined in the protocol. This doc builds upon those definitions and includes the result types and possible error cases for the implementation of each capability handler in our services. Third parties that want to provide an alternate implementation are encouraged to use compatible result and error types where possible.

## What is a Service?

We're using [ucanto](https://github.com/web3-storage/ucanto) to model services as a collection of related capabilities, which can be "invoked" by a user agent to perform some action and/or make a request.

Capabilities are defined in terms of **abilities** and **resources**. 

The **ability** is a string identifying some "verb," or action that can be performed. Ability strings have a format of `namespace/action`, for example, `account/info`.

A **resource** is something that can be acted upon, identified by a URI. In w3-protocol services, many of the resource URIs will be `did:` URIs that identify a user account or storage location.

Capabilities may also contain **caveats**, which act like function parameters when used in an invocation.

A `ucanto` service takes in a stream of invocations, which you can think of as serialized RPC requests that are encoded as UCANs and signed by the caller. An invocation must contain a proof that the capability being invoked has been delegated to the caller.

A `ucanto` service uses the ability string to dispatch an invocation to the correct "capability provider" function, which executes some logic and (optionally) returns some result to the caller.

See [capabilities.md](./capabilities.md) for more details about capabilities, including the optional and required caveats for each.

## Error handling

Most capability providers have error conditions that will result in a "failure" response instead of the expected success response.

Ucanto's `Failure` type is a JavaScript `Error` subclass, from which custom error types are derived.

When serialized to JSON, a `Failure` is represented as an object:

```json
{
  "error": true,
  "name": "TheNameOfTheError",
  "message": "A short message with details about what went wrong",
  "stack": "An optional stack trace."
}
```

The table below lists `Failure` types that are [defined in ucanto](https://github.com/web3-storage/ucanto/blob/main/packages/validator/src/error.js). Many of the types below are returned by ucanto when validating invocations and delegations and are not specific to a particular capability or handler. 

The most common "capability specific" error is `MalformedCapability`, which is returned when an invocation is structurally correct and includes valid proofs, but the capability handler cannot process it, for example, because it has missing or invalid caveats. 

The `cause` field of a `MalformedCapabilty` object contains a `Failure` with details about the constraints that were violated.

| name                  | description                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `EscalatedCapability` | A claimed capability exceeds the bounds of a delegation |
| `InvalidClaim` | A claim is invalid for one or more reasons. Contains a `causes` field that contains the specific failures that occurred during validation. |
| `InvalidSignature` | A signature is invalid |
| `UnavailableProof` | A proof was referenced in a claim but could not be found by the validator. Applies only to proofs that are linked by CID, not those inlined into a UCAN. |
| `InvalidAudience` | The audience of a delegation does not match the identity of the agent attempting to claim the capability |
| `MalformedCapability` | An invocation lacks required caveats, or caveat values are invalid. Contains a `cause` field with a `Failure` describing the problem. |
| `UnknownCapability` | An agent has tried to invoke a capability that the service is unaware of |
| `Expired` | An agent is trying to claim a capability whose delegation has expired |
| `NotValidBefore` | An agent is trying to claim a capability before the start of the delegation's validity period |


## Accounts service

### `account/info`

Provides the [`account/info` capability](./capabilities.md#accountinfo).

#### Invocation

The `with` field of the invocation must contain the `did:` URI for the account to be identified.

#### Response

On success, the service returns an `Account` object with the following fields:

| field         | type     | description                                                 |
| ------------- | -------- | ----------------------------------------------------------- |
| `did`         | `string` | The DID of the account                                      |
| `agent`       | `string` | The DID of the primary agent associated with the account    |
| `email`       | `string` | The email registered to the account                         |
| `product`     | `string` | `product:` URI of product registered to the account, if any |
| `updated_at`  | `string` | ISO 8601 timestamp of last update to account record         |
| `inserted_at` | `string` | ISO 8601 timestamp of account record creation               |

#### Errors

May fail with a `MalformedCapability` if the account does not exist.

### `account/recover`

### `account/recover-validation`


## Storage service

### `store/add`

Provides the [`store/add` capability](./capabilities.md#storeadd), which can be invoked to store CAR files with the service.

#### Invocation

The `with` field of the invocation must contain the DID of a "memory space" that serves as the destination of the CAR. The invocation must contain proof that the caller posesses the `store/add` capability for the given space DID.

The invocation must include a `link` caveat, whose value is the CID of the CAR to be stored. This implies that the caller must encode the CAR data and calculate the CID locally before invoking `store/add`.

The invocation must also include a `size` caveat set to the size of the CAR in bytes.

#### Response

On success, the service will return an object containing status information, possibly including a signed URL for uploading CAR data.

| field     | type                     | description                                                                                    |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| `status`  | `string`                 | One of `"upload"` or `"done"`, depending on whether the CAR is new to the service (see below)  |
| `with`    | `string`                 | The DID of the memory space the CAR was added to                                               |
| `link`    | `CID`                    | The CID of the added CAR file                                                                  |
| `url`     | `string`                 | URL to send CAR data to. Only present if `status == "upload"`                                  |
| `headers` | `Record<string, string>` | Headers to include in POST request when sending CAR data. Only present if `status == "upload"` |

If the CID in the invocation's `link` caveat already exists on the service, e.g. because it was previously added by another agent, the `status` field in the response will be `"done"`, and the response will not include a URL for uploading.

If the CAR has not been previously added, the `status` field will contain `"upload"`, and the `url` and `headers` fields will contain the information needed to send the CAR data to the storage backend.

If the response contains `url` and `headers` fields, the client should issue an HTTP `POST` request to the URL and include the headers. The request body must be the CAR data, whose size and CID must match those in the invocation.

#### Errors

May fail with a `MalformedCapability` if no `link` caveat is provided.

### `store/remove`

Provides the [`store/remove` capability](./capabilities.md#storeremove), which removes the association between a CAR file and a memory space.

#### Invocation

The invocation's `with` field must be set to the DID of the memory space where the CAR is currently stored, and the caller must provide proof that they possess the `store/remove` capability for that space.

The invocation's `link` caveat must be set to the CID of the CAR to be removed.

#### Response

On success, the service will echo back the CID of the removed CAR, as a string.

#### Errors

May fail with a `MalformedCapability` if no `link` caveat is provided.

### `store/list`

Provides the [`store/list` capability](./capabilities.md#storelist), which returns a list of stored CAR files for a given memory space.

#### Invocation

The invocation's `with` field must be set to the DID of the memory space to be listed, and the caller must provide proof that they posess the `store/list` capability for that space.

Note that caveats for pagination will be added in the near future.

#### Response

On success, returns an object whose `results` field contains an array of `StoreItem` metadata objects for each stored CAR.

A `StoreItem` has the following fields:

| field            | type             | description                                                    |
| ---------------- | ---------------- | -------------------------------------------------------------- |
| `uploaderDID`    | `string`         | The DID of the agent who uploaded the CAR                      |
| `payloadCID`     | `string` (`CID`) | The CID of the CAR                                             |
| `applicationDID` | `string`         | Reserved for future use                                        |
| `origin`         | `string` (`CID`) | Link from this CAR to another shard of the same DAG (optional) |
| `proof`          | `string`         | Encoded UCAN of proof included with upload invocation          |
| `size`           | `number`         | Size of CAR data in bytes                                      |
| `uploadedAt`     | `string`         | ISO 8601 timestamp of upload                                   |

The full response object returned by `store/list` currently looks like this, although there may be changes when pagination is fully implemented. Currently, the service always returns all results in a single "page".

| field      | type          | description                                               |
| ---------- | ------------- | --------------------------------------------------------- |
| `count`    | `number`      | The total number of CARs in the memory space              |
| `pages`    | `number`      | The number of pages available in the listing              |
| `page`     | `number`      | The index of the current page of results                  |
| `pageSize` | `number`      | The max number of results in each page                    |
| `results`  | `StoreItem[]` | An array of `StoreItem`s (see above) for the current page |

## Uploads service

The uploads service provides capabilities that link "data CIDs" to "CAR CIDs". A data CID is the root of some user-provided DAG, e.g. a UnixFs directory tree or a dag-cbor object. An "upload" is an association between a data CID and one or more CARs that contain the blocks of the DAG.

There is a many-to-many relationship between data CIDs and CAR CIDs. A single CAR can contain multiple data CIDs, and the DAG for a given data CID may be "sharded" across multiple CARs.

### `upload/add`

Provides the [`upload/add` capability](./capabilities.md#uploadadd), which adds an association between a root data CID and the set of CAR "shards" containing the data.

#### Invocation

The `with` field of the invocation must contain the DID of a "memory space," and the caller must provide proof that they possess the `upload/add` capability for that space.

The `root` caveat must be set to the root CID string of the data item supplied by the user.

The `shards` caveat must be set to an array of CID strings that identify the CARs containing the data blocks referenced by the `root` data CID. These CARs are expected to have been previously stored with [`store/add`](#storeadd).

#### Response

The current implementation returns `null` on success, but this may be changed in the future to return an object describing upload.

#### Errors

May fail with a `MalformedCapability` if no `root` CID caveat is provided, or if the `shards` caveat is missing or contains an empty array.

### `upload/remove`

Provides the [`upload/remove` capability](./capabilities.md#uploadremove), which removes an upload from a given "memory space".

#### Invocation

The `with` field of the invocation must contain the DID of a "memory space," and the caller must provide proof that they possess the `upload/remove` capability for that space.

The `root` caveat must be set to the root "data CID" to be removed.

#### Response

The service currently returns no value on success.

#### Errors

May fail with a `MalformedCapability` if no `root` CID caveat was provided.

### `upload/list`

Provides the [`upload/list` capability](./capabilities.md#uploadlist). Upon invocation, returns a list of metadata objects describing the uploads contained in a memory space.

#### Invocation

The `with` field of the invocation must contain the DID of a "memory space," and the caller must provide proof that they possess the `upload/list` capability for that space.

#### Response

On success, returns an object whose `results` field contains an array of `UploadItem` metadata objects for each upload.

An `UploadItem` has the following fields:

| field         | type             | description                                                                       |
| ------------- | ---------------- | --------------------------------------------------------------------------------- |
| `uploaderDID` | `string`         | The DID of the agent who uploaded the CAR                                         |
| `dataCID`     | `string` (`CID`) | The root CID of the stored data item                                              |
| `carCID`      | `string`         | The CID of a CAR associated with this upload. See below for notes about sharding. |
| `uploadedAt`  | `string`         | ISO 8601 timestamp of upload                                                      |

Note that each `UploadItem` contains a single `carCID`. For uploads that span multiple CARs, the response will contain multiple `UploadItem`s with the same `dataCID`, but with different `carCID`s, which should be collected on the client to get the full set of CAR CIDs for a "sharded" upload.

The full response object returned by `upload/list` currently looks like this, although there may be changes when pagination is fully implemented. Currently, the service always returns all results in a single "page".

| field      | type           | description                                                |
| ---------- | -------------- | ---------------------------------------------------------- |
| `count`    | `number`       | The total number of CARs in the memory space               |
| `pages`    | `number`       | The number of pages available in the listing               |
| `page`     | `number`       | The index of the current page of results                   |
| `pageSize` | `number`       | The max number of results in each page                     |
| `results`  | `UploadItem[]` | An array of `UploadItem`s (see above) for the current page |