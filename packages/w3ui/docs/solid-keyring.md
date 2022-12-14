# `@w3ui/solid-keyring`

## Install

```sh
npm install @w3ui/solid-keyring
```

## Usage

```js
import * as SolidKeyring from '@w3ui/solid-keyring'
```

## Exports

* [`KeyringProvider`](#keyringprovider)
* [`useKeyring`](#usekeyring)

---

### `KeyringProvider`

Provider for managing agent creation, key management, and space registration with the service.

Example:

```jsx
import { KeyringProvider } from '@w3ui/solid-keyring'

function App () {
  return (
    <KeyringProvider>
      {/* Application pages/components */}
    </KeyringProvider>
  )
}
```

You can optionally target a non-production instance of the access service by setting the `servicePrincipal` and `connection` props on `KeyringProvider`. The `servicePrincipal` should be set to the service's DID, and `connection` should be a ucanto `ConnectionView` to the service instance.

### `useKeyring`

```ts
const [state, actions] = useKeyring()
```

Hook to allow use of the [`KeyringProvider`](#keyringprovider) value. The value returned is a `KeyringContextValue`:

```ts
export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]
```

See [keyring-core.md](./keyring-core.md) for the definitions for [`KeyringContextState`](./keyring-core.md#keyringcontextstate) and [`KeyringContextActions`](./keyring-core.md#keyringcontextactions).
