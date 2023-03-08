# Capabilities

This reference doc contains details about each capability defined in the w3-protocol suite of services. It does not specify the exact RPC semantics for each service, for example, result schemas, possible error conditions, etc. See [services.md](./services.md) for those details. 

## About the definitions

A capability consists of several components:

- The **ability** is the "verb" of the capability, describing the action an agent can perform. For example, `store/add` allows adding CAR files to the store. Abilities are encoded into the `can` field in a UCAN delegation or invocation.
- The **resource** is the "noun" of the capability, describing something that an agent is trying to perform an action _on_. Resources are URIs and are encoded into the `with` field of a UCAN.
- The **caveats** are qualifiers that can constrain delegations or parameterize invocations. See below for more details. Caveats are encoded into the `nb` object field of a UCAN.

In the definitions below, we identify capabilities by the ability name, which is used by the service provider to route invocations to the correct handler. The definitions include what kinds of resource URI are acceptable, as well as optional and required caveats that can be included in an invocation.

The caveats are used for two complementary purposes. When used in an invocation, they act as "function parameters" for the remote procedure call, giving the capability provider the context they need to fulfill the request. For example, the `link` caveat in a `store/add` invocation specifies the CID of the CAR to be stored.

When used in a delegation, caveats act as constraints on the values allowed in an invocation. For example, if a `store/add` delegation has a `size` caveat of 10MB, your invocation's `size` caveat must be less than or equal to 10MB.

### Issuer and audience

UCANs have a notion of "issuer" and "audience", represented by the `iss` and `aud` fields.

In an invocation, the audience is the service provider, and the issuer is the agent that is making the request.

In a delegation, the audience is the agent who is being delegated _to_, and the issuer is an agent who already posesses the capability and is delegating to the audience. In the common case of a single delegation from service provider to user agent, the service would be the issuer, and the user agent would be the audience. 

There may be multiple delegations in a chain, for example: service `A` issues a delegation to service `B` as the audience, followed by service `B` issuing a delegation to user agent `U` as the audience. To exercise the capability, `U` would issue an invocation with `A` as the audience and include the delegation chain as proof of authorization.

## Accounts

The `account/` namespace contains capabilities related to account identification and recovery.

Note that we have recently begun referring to accounts as "memory spaces," because the word "account" has many meanings, none of which map precisely to our use case. The capabilities related to memory spaces still use the  `account/` namespace, but this may change in the future. If so, this doc will be updated to reflect the change.

The `account/*` capability contains (can derive) all abilities in the `account/` namespace, so long as the derived capability has the same resource URI.

### `account/info`

> Request information about a memory space DID.

The `account/info` capability can be invoked to request information about a "memory space". The `with` resource URI identifies the space, usually with a `did:key` URI.

See [services.md](./services.md) for a description of the result type and possible errors.

#### Derivations

`account/info` can be derived from an `account/*` or `*` capability with a matching `with` field.

It can also be derived from any of the capabilities in the `store/` namespace, including [`store/*`](#store).

#### Caveats

`account/info` has no defined caveats.

### `account/recover`

> Obtain a replacement capability delegation.

In the event that an agent loses the UCAN that encodes their capability delegations for a memory space (e.g. due to accidental deletion, disk corruption, etc.), they may invoke the `account/recover` capability to obtain a new delegation of the capabilities they previously had access to.

The `with` resource URI of the `account/recover` invocation must contain the DID of the memory space that the agent is attempting to recover access to.

The invocation must contain proof that the agent possesses the `account/recover` capability. As the agent is presumably attempting to recover because they have lost their proofs, this implies that the service must have a way to verify the identity of the agent "out of band" (not using UCAN proofs).

See the [`account/recover-validation`](#accountrecover-validation) capability for more on identity validation.

#### Derivations

`account/recover` can be derived from an `account/*` or `*` capability with an equal `with` field.

#### Caveats

`account/recover` has no defined caveats.

### `account/recover-validation`

> Validate a registered external identity to initiate the recovery process.

If an agent loses the UCAN that encodes their capability delegations for a memory space, they can initiate a recovery process by invoking the `account/recover-validation` capability.

This is one of the few capabilities that can be invoked without inlcuding proof of delegation, as it is intended to be used when proofs have been lost. <!-- TODO: is this true? verify w/Hugo -->

Instead, the service provider will verify a registered external identity (e.g. email), and will issue a delegation for the `account/recover` capability after verification is complete.

#### Caveats

The `account/recover-validation` invocation must include an `email` caveat containing an email address that has been previously registered (e.g. using [`voucher/redeem`](#voucherredeem)).

In the future, the capability may allow validation of other types of external identity besides email. This doc will be updated to include the proper caveats when that change happens.

## CAR storage

The `store/` namespace contains capabilities relating to storage of CAR files.

This is distinct from the `upload/` namespace, which associates root "data" CIDs with one or more CARs.

The resource URI used in the `store/` capabilities is a `did:key` URI that identifies a "memory space" that acts as a destination for the stored CARs. A memory space is analagous to a bucket in S3 in that it has a unique id, groups stored objects for "directory listing" and usage/quota tracking, and is associated with a user account.

### `store/*`

The `store/*` capability can be delegated to a user agent, but cannot be invoked directly. Instead, it allows the audience to derive any capability in the `store/` namespace, provided the resource URI matches the one in the `store/*` capability delegation.

The `store/*` capability (and all capabilities in the `store/` namespace) can be derived from a `*` "super user" capability with a matching resource URI.

### `store/add` 

> Store a CAR file

The `store/add` capability allows an agent to store a CAR file into the memory space identified by the `did:key` URI in the `with` field. The agent must precompute the CAR locally and provide the CAR's CID and size using the `nb.link` and `nb.size` fields, allowing a service to provision a write location for the agent to `PUT` or `POST` the CAR into.

#### Derivations

`store/add` can be derived from a `store/*` or `*` capability with a matching `with` field.

#### Caveats

It is possible for a service to issue a `store/add` delegation with a `link` caveat, which would restrict the user to only storing a specific CID. This is not terribly useful, however, so delegations are unlikely to contain a `link` restriction.

The `size` caveat is much more likely to be included in a delegation, as service providers may want to limit the maximum CAR size that they will accept. Agents should check their delegation's `nb.size` field and ensure that they only send CARs with a size below the limit. If `nb.size` is set in the delegation, the agent must include an `nb.size` field in their invocation, with a value that is `<=` the limit set in the delegation's `nb.size` field.

#### Invocation

Example:

```js
{
  can: "store/add",
  with: "did:key:abc...",
  nb: {
    link: "bag...",
    size: 1234
  }
}
```

Fields marked as "required" below must be present in the invocation, but may be absent in capability delegations. 

| field       | value                             | required? | context                                                             |
| ----------- | --------------------------------- | --------- | ------------------------------------------------------------------- |
| `can`       | `store/add`                       | ✅         | The ability to add CAR data to a memory space.                      |
| `with`      | URI string, e.g. `did:key:123...` | ✅         | The `did:key` URI for the CAR's destination memory space            |
| `nb.link`   | CAR CID string, e.g. `bag123...`  | ✅         | CID of CAR that the user wants to store                             |
| `nb.origin` | CAR CID string, e.g. `bagabc...`  | ⛔         | Optional link to related CARs. See below for more details.          |
| `nb.size`   | size in bytes                     | ✅         | If the `size` caveat is present, the uploaded CAR must be `<= size` |

The `nb.origin` field may be set to provide a link to a related CAR file. This is useful when storing large DAGs that are sharded across multiple CAR files. In this case, the agent can link each uploaded shard with a previous one. Providing the `origin` field informs the service that the CAR being stored is a shard of the larger DAG, as opposed to an intentionally partial DAG. 

### `store/remove` 

> Remove a stored CAR

The `store/remove` capability can be invoked to remove a CAR file from a memory space, identified by the resource URI in the `with` field. 

This may or may not cause the CAR to be removed completely from Elastic IPFS; for example, if the CAR exists in other memory spaces, it will not be removed. 

`store/remove` will remove the CAR from the listing provided by [`store/list`](#storelist) for the memory space. Removal may also have billing implications, depending on the service provider (e.g. by affecting storage quotas).

#### Derivations

`store/remove` can be derived from a `store/*` or `*` capability with a matching `with` field.

#### Caveats

When invoking `store/remove`, the `link` caveat must be set to the CID of the CAR file to remove. 

If a delegation contains a `link` caveat, an invocation derived from it must have the same CAR CID in its `link` field. A delegation without a `link` caveat may be invoked with any `link` value.

#### Invocation

```js
{
  can: "store/remove",
  with: "did:key:abc...",
  nb: {
    link: "bag...",
  }
}
```

| field     | value                             | required? | context                                             |
| --------- | --------------------------------- | --------- | --------------------------------------------------- |
| `can`     | `store/remove`                    | ✅         | The ability to remove CAR data from a memory space. |
| `with`    | URI string, e.g. `did:key:123...` | ✅         | The `did:key` URI for the CAR's memory space        |
| `nb.link` | CAR CID string, e.g. `bag...`     | ✅         | The CID of the CAR file to remove                   |

### `store/list`

> Obtain a list of stored CARs

The `store/list` capability can be invoked to request a list of CARs in a given memory space.

The `with` field of the invocation must be set to the DID of the memory space to be listed.

#### Derivations

`store/list` can be derived from a `store/*` or `*` capability with a matching `with` field.

#### Caveats

`cursor` can be set to start listing from an item in the middle of the list. Its value should be a `cursor` returned by a previous invocation of `store/list`
`size` can be set to change the number of items returned by an `store/list` invocation
`pre` can be set to `true` to return the page of results preceding `cursor` rather than the results after `cursor`. Defaults to `false`.

| field       | value                    | required? | context                                                         |
| ----------- | ------------------------ | --------- | --------------------------------------------------------------- |
| `nb.cursor` | string                   | ❌         | A cursor returned by a previous invocation                      |
| `nb.size`   | integer                  | ❌         | The maximum number of results to return                         |
| `nb.pre`    | boolean                  | ❌         | If true, return the page of results preceding the cursor |

## `upload/` namespace

Capabilities relating to "uploads", which represent user data that is contained in one or more CAR files that have previously been stored using [`store/add`](#storeadd).

An upload is essentially an index that maps "data CIDs" to CAR CIDs. Data CIDs are the root CID of user-uploaded data items, for example, files that have been encoded into UnixFs. A given data item may be stored in a single CAR, or it may be split into multiple CAR "shards." 

Similarly, a CAR can potentially contain many data items. This is true even if the CAR has only a single root CID. For example, when storing a CAR containing a nested directory structure, you could create one "upload" for the root of the directory structure, and a separate upload for a file nested inside.

### `upload/*`

The `upload/*` capability can be delegated to a user agent, but cannot be invoked directly. Instead, it allows the audience to derive any capability in the `upload/` namespace, provided the resource URI matches the one in the `upload/*` capability delegation.

The `upload/*` capability (and all capabilities in the `upload/` namespace) can be derived from a `*` "super user" capability with a matching resource URI.

### `upload/add`

> Add an upload to a memory space.

Can be invoked to register a given "data CID" as being contained in a given set of CARs. The resulting "upload" will be associated with the memory space identified by the DID in the `with` field.

#### Derivations

`upload/add` can be derived from an `upload/*` or `*` capability with a matching `with` resource URI.

#### Caveats

When invoking `upload/add`, the `root` caveat must be set to the root CID of the data item. 

The `shards` array must contain at least one CID of a CAR file, which is expected to have been previously stored. 

Taken together, the CARs in the `shards` array should contain all the blocks in the DAG identified by the `root` CID.

| field       | value                                                    | required? | context                                                         |
| ----------- | -------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| `can`       | `upload/add`                                             | ✅         | The ability to add uploads to the index                         |
| `with`      | URI string, e.g. `did:key:123...`                        | ✅         | The `did:` URI of the memory space to add to                    |
| `nb.root`   | data CID string, e.g. `bafy...`                          | ✅         | The CID of the data item that was uploaded                      |
| `nb.shards` | array of CID strings, e.g. `[ "bag123...", "bag234..."]` | ✅         | The CIDs of CAR files containing the full DAG for the data item |


### `upload/remove`

> Remove an upload from a memory space.

`upload/remove` can be invoked to remove the link between an uploaded data CID and the CARs containing the data. 

Note that this will not remove the stored CARs; you will need to use [`store/remove`](#storeremove) to remove the CARs once all uploads referencing those CARs have been removed.

#### Derivations

`upload/remove` can be derived from an `upload/*` or `*` capability with a matching `with` resource URI.

#### Caveats

The `with` resource URI must be set to the DID of the memory space to remove the upload from.

The `root` caveat must contain the root CID of the data item to remove.

| field     | value                             | required? | context                                                      |
| --------- | --------------------------------- | --------- | ------------------------------------------------------------ |
| `can`     | `upload/remove`                   | ✅         | The ability to remove uploads from the index                 |
| `with`    | URI string, e.g. `did:key:123...` | ✅         | The `did:` URI of the memory space to remove the upload from |
| `nb.root` | data CID string, e.g. `bafy...`   | ✅         | The CID of the data item to remove                           |


### `upload/list`

> Obtain a list of uploaded data items.

The `upload/list` capability can be invoked to request a list of metadata about uploads. See [services.md](./services.md#uploadlist) for details about the response.

The `with` field of the invocation must be set to the DID of the memory space to be listed.

#### Derivations

`upload/list` can be derived from a `upload/*` or `*` capability with a matching `with` field.

#### Caveats

`cursor` can be set to start listing from an item in the middle of the list. Its value should be a `cursor` returned by a previous invocation of `upload/list`
`size` can be set to change the number of items returned by an `upload/list` invocation
`pre` can be set to `true` to return the page of results preceding `cursor` rather than the results after `cursor`. Defaults to `false`.

| field       | value                    | required? | context                                                         |
| ----------- | ------------------------ | --------- | --------------------------------------------------------------- |
| `nb.cursor` | string                   | ❌         | A cursor returned by a previous invocation                      |
| `nb.size`   | integer                  | ❌         | The maximum number of results to return                         |
| `nb.pre`    | boolean                  | ❌         | If true, return the page of results preceding the cursor       |

## `voucher/` namespace

TODO: more voucher docs when implementation details settle down a bit.

### `voucher/claim`

Request a voucher that can be redeemed to activate features and/or products for an account or agent DID.

<!-- 

TODO: add context here:
- what are valid product URIs? Or is that an opaque detail for the caller?
- is `identity` always a mailto: URI? 
- double check that `with` URI should be the DID of the service

-->

#### Caveats

| field         | value                             | required? | context                                                              |
| ------------- | --------------------------------- | --------- | -------------------------------------------------------------------- |
| `can`         | `voucher/claim`                   | ✅         | The ability to claim a voucher.                                      |
| `with`        | DID string, e.g. `did:key:123...` | ✅         | The DID of the service offering the product                          |
| `nb.product`  | URI string with `product:` scheme | ✅         | A URI identifying the product                                        |
| `nb.identity` | string, e.g. `mailto:`            | ✅         |                                                                      |
| `nb.account`  | DID string                        | ✅         | The DID of the memory space or account that will receive the product |

### `voucher/redeem`

Redeeem a voucher to activate features / products for an account or agent DID.

<!--
TODO: document this. currently, the implementation ignores caveats & creates a new account for every successful redemption. Might be changing?
-->