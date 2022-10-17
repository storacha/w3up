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

* [`AuthProvider`](#authprovider)
* [`useAuth`](#useauth)

---

### `AuthProvider`

Provider for authentication with the service.

Example:

```jsx
import { AuthProvider } from '@w3ui/react-keyring'

function App () {
  return (
    <AuthProvider>
      {/* Application pages/components */}
    </AuthProvider>
  )
}
```

### `useAuth`

```ts
const auth = useAuth()
```

Hook to allow use of the [`AuthProvider`](#authprovider) value. The value returned is an `AuthContextValue`:

```ts
interface AuthContextValue {
  /**
   * The current identity
   */
  identity?: Identity
  /**
   * Load the default identity from secure storage.
   */
  loadDefaultIdentity: () => Promise<void>
  /**
   * Unload the current identity from memory.
   */
  unloadIdentity: () => Promise<void>
  /**
   * Unload the current identity from memory and remove from secure storage.
   */
  unloadAndRemoveIdentity: () => Promise<void>
  /**
   * Register a new identity, verify the email address and store in secure
   * storage. Use cancelRegisterAndStoreIdentity to abort.
   */
  registerAndStoreIdentity: (email: string) => Promise<void>
  /**
   * Abort an ongoing identity registration.
   */
  cancelRegisterAndStoreIdentity: () => void
  /**
   * Authentication status of the current identity.
   */
  authStatus: AuthStatus
}
```
