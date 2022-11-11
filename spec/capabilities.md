# Capabilities

This reference doc contains details about each capability defined in the w3-protocol suite of services. It does not specify the exact RPC semantics for each service, for example, result schemas, possible error conditions, etc. See [services.md](./services.md) for those details. 

## About the definitions

A capability consists of several components:

- The **ability** is the "verb" of the capability, describing the action an agent can perform. For example, `store/add` allows adding CAR files to the store. Abilities are encoded into the `can` field in a UCAN delegation or invocation.
- The **resource** is the "noun" of the capability, describing something that an agent is trying to perform an action _on_. Resources are URIs and are encoded into the `with` field of a UCAN.
- The **caveats** are qualifiers that can constrain delegations or parameterize invocations. See below for more details. Caveats are encoded into the `nb` object field of a UCAN.

In the definitions below, we identify capabilities by the ability name, which is used by the service provider to route invocations to the correct handler. The definitions include what kinds of resource URI are acceptable, as well as optional and required caveats that can be included in an invocation.

The caveats are used for two complementary purposes. When used in an invocation, they act as "function parameters" for the remote procedure call, giving the capability provider the context they need to fulfil the request. For example, the `link` caveat in a `store/add` invocation specifies the CID of the CAR to be stored.

When used in a delegation, caveats act as constraints on the values allowed in an invocation. For example, if a `store/add` delegation has a `size` caveat of 10MB, your invocation's `size` caveat must be less than or equal to 10MB.

### Issuer and audience

UCANs have a notion of "issuer" and "audience", represented by the `iss` and `aud` fields.

In an invocation, the audience is the service provider, and the issuer is the agent that is making the request.

In a delegation, the audience is the agent who is being delegated _to_, and the issuer is an agent who already posesses the capability and is delegating to the audience. In the common case of a single delegation from service provider to user agent, the service would be the issuer, and the user agent would be the audience. 

There may be multiple delegations in a chain, for example: service `A` issues a delegation to service `B` as the audience, followed by service `B` issuing a delegation to user agent `U` as the audience. To exercise the capability, `U` would issue an invocation with `A` as the audience and include the delegation chain as proof of authorization.

## Accounts

The `account/` namespace contains capabilities related to account identification and recovery.

The `account/*` capability contains (can derive) all abilities in the `account/` namespace, so long as the derived capability has the same resource URI.

### `account/info`

> Request information about an account DID.

### `account/recover-validation`

### `account/recover`

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

| field       | value         | required? | context                                                             |
| ----------- | ------------- | --------- | ------------------------------------------------------------------- |
| `can`       | `store/add`   | ✅         | The ability to add CAR data to an account.                          |
| `with`      | `did:*`       | ✅         | The `did:key` URI for the CAR's destination memory space            |
| `nb.link`   | `bagk123...`  | ✅         | CID of CAR that the user wants to store                             |
| `nb.origin` | `bagkabc...`  | ⛔         | Optional link to related CARs. See below for more details.          |
| `nb.size`   | size in bytes | ✅         | If the `size` caveat is present, the uploaded CAR must be `<= size` |

The `nb.origin` field may be set to provide a link to a related CAR file. This is useful when storing large DAGs that are sharded across multiple CAR files. In this case, the agent can link each uploaded shard with a previous one. Providing the `origin` field informs the service that the CAR being stored is a shard of the larger DAG, as opposed to an intentionally partial DAG. 

### `store/remove` 

> Remove a stored CAR

The `store/remove` capability can be invoked to remove the association between a previously stored CAR and an account.



```js
{
  can: "store/remove",
  with: "did:key:abc...",
  nb: {
    link: "bag...",
  }
}
```

### `store/list`

> Obtain a list of stored CARs

## `upload/*` namespace

Capabilities relating to "uploads", which consist of a root CID for some content, as well as links the the CARs containing the content blocks.

### `upload/add`

### `upload/remove`

### `upload/list`


## `voucher/*` namespace

### `voucher/claim`

Request a voucher that can be redeemed to activate features and/or products for an account or agent DID.

### `voucher/redeem`

