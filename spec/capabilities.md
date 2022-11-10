# Capabilities

## Accounts

The `account/` namespace contains capabilities related to account identification and recovery.

The `account/*` capability contains (can derive) all abilities in the `account/` namespace, so long as the derived capability has the same resource URI.

### `account/info`

Request information about an account DID.



### `account/recover-validation`

### `account/recover`

## CAR storage

The `store/` namespace contains capabilities relating to storage of CAR files.

This is distinct from the `upload/` namespace, which associates root "data" CIDs with one or more CARs.

### `store/add` - store a CAR and associate it with an account

The `store/add` capability can be invoked to store a CAR file with the service.

The stored CAR will be associated with the account identified by the `with` resource URI.

When invoking the capability, the user must specify the CAR CID in the `link` caveat field. 

If a capability delegation includes the `link` caveat, the user's invocation must contain a matching `link` caveat with an equal CID value. If the delegation does not have a `link` caveat, the user may set `link` to any valid CAR CID.

If a delegation includes the `size` caveat, the invocation must also include a `size` caveat with a value `<=` the delegated `size`. The `size` field in the invocation should match the size of the CAR to be stored.

```js
{
  can: "store/add",
  with: "did:key:abc...",
  nb: {
    link: "bag...",
  }
}
```

| field       | value         | context                                                             |
| ----------- | ------------- | ------------------------------------------------------------------- |
| `can`       | `store/add`   | The ability to add CAR data to an account.                          |
| `with`      | `did:*`       | The `with` resource URI must have a `did` scheme                    |
| `nb.link`   | `bag...`      | CID of CAR that the user wants to store                             |
| `nb.origin` | ?             | Not sure... FIXME(@hugomrdias): can you add some context here?      |
| `nb.size`   | size in bytes | If the `size` caveat is present, the uploaded CAR must be `<= size` |

### `store/remove` - remove the association between a stored CAR and an account

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

## `upload/*` namespace

Capabilities relating to "uploads", which consist of a root CID for some content, as well as links the the CARs containing the content blocks.

### `upload/add`

### `upload/remove`

### `upload/list`


## `voucher/*` namespace

### `voucher/claim`

Request a voucher that can be redeemed to activate features and/or products for an account or agent DID.

| Ability         | Resource             |
| --------------- | -------------------- |
| `voucher/claim` | Account or agent DID |

Caveats:

| Name | Type                         | Description                                                        |
| ---- | ---------------------------- | ------------------------------------------------------------------ |
| `of` | `ProductLink`                | CID referencing `Product` definition object                        |
| `by` | `VerifiableID` / `MailtoURI` | URL that corresponds to the verifiable identity submitting a claim |
| `at` | `ServiceDID`                 | DID of the service that will redeem the voucher                    |

**Return value**: A UCAN that delegates the `voucher/redeem` ability to the `issuer` of the claim, after their `VerifiableID` has in fact been verified.

**Error types**:

- `ProductError`
- `IdentityError`
- `AccountError`

### `voucher/redeem`

