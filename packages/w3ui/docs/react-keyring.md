# `@w3ui/react-keyring`

## Install

```sh
npm install @w3ui/react-keyring
```

## Usage

```js
import * as ReactKeyring from '@w3ui/react-keyring'
```

## Exports

* [`Authenticator`](#authenticator)
  * [`Authenticator.Form`](#authenticatorform)
  * [`Authenticator.Email`](#authenticatoremail)
  * [`Authenticator.CancelButton`](#authenticatorcancelbutton)
* [`KeyringProvider`](#keyringprovider)
* [`useKeyring`](#usekeyring)

---

### `Authenticator`

Headless component providing agent and space creation and registration functionality. The `Authenticator`
component is designed to be used by [`Authenticator.Form`](#authenticatorform), [`Authenticator.Email`](#authenticatoremail) and other "markup components" when implementing an authentication UI.

Must be used inside of a [`KeyringProvider`](#keyringprovider).

#### `Authenticator.Form`

A `form` element designed to work with the [`Authenticator`](#authenticator) component. Any passed props will be passed along to the `form` element.

#### `Authenticator.Email`

An email `input` element designed to work with [`Authenticator.Form`](#authenticatorform). Any passed props will be passed along to the `input` component.

#### `Authenticator.CancelButton`

A `button` element that will cancel space registration, designed to work with [`Authenticator.Form`](#authenticatorform). Any passed props will be passed along to the `button` element.

### `KeyringProvider`

Provider for managing agent creation, key management, and space registration with the service.

Example:

```jsx
import { KeyringProvider } from '@w3ui/react-keyring'

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
const [keyringState, keyringActions] = useKeyring()
```

Hook to allow use of the [`KeyringProvider`](#keyringprovider) value. The value returned is a `KeyringContextValue`:

```ts
export type KeyringContextValue = [
  state: KeyringContextState,
  actions: KeyringContextActions
]
```

See [keyring-core.md](./keyring-core.md) for the definitions for [`KeyringContextState`](./keyring-core.md#keyringcontextstate) and [`KeyringContextActions`](./keyring-core.md#keyringcontextactions).
