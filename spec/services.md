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
| `updated_at`  | `string` | ISO timestamp? TODO: check this :)                          |
| `inserted_at` | `string` | see above...                                                |

#### Errors

TODO: describe possible error types, how to distinguish between them

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

| field         | type     | description                                                 |
| ------------- | -------- | ----------------------------------------------------------- |
| `status` | `string` | One of `"upload"` or `"done"`, depending on whether the CAR is new to the service (see below) |
| `with` | `string` | The DID of the memory space the CAR was added to |
| `link` | `CID` | The CID of the added CAR file |
| `url` | `string` | URL to send CAR data to. Only present if `status == "upload"` |
| `headers` | `Record<string, string>` | Headers to include in POST request when sending CAR data. Only present if `status == "upload"`

If the CID in the invocation's `link` caveat already exists on the service, e.g. because it was previously added by another agent, the `status` field in the response will be `"done"`, and the response will not include a URL for uploading.

If the CAR has not been previously added, the `status` field will contain `"upload"`, and the `url` and `headers` fields will contain the information needed to send the CAR data to the storage backend.

If the response contains `url` and `headers` fields, the client should issue an HTTP `POST` request to the URL and include the headers. The request body must be the CAR data, whose size and CID must match those in the invocation.

### `store/remove`

### `store/list`

## Uploads service

TODO