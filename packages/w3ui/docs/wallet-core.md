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

* [loadDefaultIdentity](#loaddefaultidentity)
* [loadIdentity](#loadidentity)
* [registerIdentity](#registerrdentity)
* [removeIdentity](#removeidentity)
* [storeIdentity](#storeidentity)

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

### `registerIdentity`

```ts
registerIdentity (email: string, options: RegisterIdentityOptions = {}): Promise<Identity>
```

Register a new identity and verify the email address. Use the `onAuthStatusChange` callback in `options` to be notified of progress. Additionally, an [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be passed in options to cancel the registration/verification.

Example:

```js
const controller = new AbortController()
const { email, signingAuthority } = await registerIdentity('test@example.com', {
  onAuthStatusChange: console.log,
  signal: controller.signal
})
console.log(`DID: ${signingAuthority.did()}`)
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
