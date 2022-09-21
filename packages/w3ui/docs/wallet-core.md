# `@w3ui/wallet-core`

## Install

```sh
npm install @w3ui/wallet-core
```

## Usage

```js
import * as WalletCore from '@w3ui/wallet-core'
```

## Exports

* [`loadDefaultIdentity`](#loaddefaultidentity)
* [`loadIdentity`](#loadidentity)
* [`createIdentity`](#createidentity)
* [`sendVerificationEmail`](#sendverificationemail)
* [`waitIdentityVerification`](#waitidentityverification)
* [`registerIdentity`](#registeridentity)
* [`removeIdentity`](#removeidentity)
* [`storeIdentity`](#storeidentity)

---

### `loadDefaultIdentity`

```ts
loadDefaultIdentity (): Promise<Identity | undefined>
```

Load the default identity on this device, returning `undefined` if none exist.

Example:

```js
const identity = await loadDefaultIdentity()
if (identity) {
  console.log(`DID: ${identity.signingAuthority.did()}`)
} else {
  console.log('No identity registered')
}
```

### `loadIdentity`

```ts
loadIdentity ({ email: string }): Promise<Identity | undefined>
```

Load an identity matching the passed argument from secure storage, returning `undefined` if not found.

Example:

```js
const identity = await loadIdentity('test@example.com')
if (identity) {
  console.log(`DID: ${identity.signingAuthority.did()}`)
} else {
  console.log('Not found')
}
```

### `createIdentity`

```ts
createIdentity ({ email: string }): Promise<UnverifiedIdentity>
```

Create a new identity.

### `sendVerificationEmail`

```ts
function sendVerificationEmail (identity: UnverifiedIdentity): Promise<void>
```

### `waitIdentityVerification`

```ts
function waitIdentityVerification (identity: UnverifiedIdentity, options?: { signal: AbortSignal }): Promise<{ identity: VerifiedIdentity, proof: Delegation<[IdentityRegister]> }>
```

Wait for identity verification to complete (user must click link in email).

### `registerIdentity`

```ts
registerIdentity (identity: VerifiedIdentity, proof: Delegation<[IdentityRegister]>): Promise<void>
```

Register a verified identity with the service, passing the proof of verification (a delegation allowing registration).

Example:

```js
const unverifiedIdentity = await createIdentity('test@example.com')
console.log(`DID: ${unverifiedIdentity.signingAuthority.did()}`)
await sendVerificationEmail(unverifiedIdentity)
const controller = new AbortController()
const { identity, proof } = await waitIdentityVerification(unverifiedIdentity, {
  signal: controller.signal
})
await registerIdentity(identity, proof)
```

### `removeIdentity`

```ts
removeIdentity (identity: Identity): Promise<void>
```

Remove the passed identity from secure storage.


# `storeIdentity`

```ts
storeIdentity (identity: Identity): Promise<void>
```

Store identity locally in secure storage and set the default.
