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

* [`AuthProvider`](#authprovider)
* [`useAuth`](#useauth)

---

### `AuthProvider`

Provider for authentication with the service.

Example:

```jsx
import { AuthProvider } from '@w3ui/solid-keyring'

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
const [state, actions] = useAuth()
```

Hook to allow use of the [`AuthProvider`](#authprovider) value. The value returned is an `AuthContextValue`:

```ts
interface AuthContextState {
  /**
   * The current identity
   */
  readonly identity?: Identity
  /**
   * Authentication status of the current identity.
   */
  readonly status: AuthStatus
}

type AuthContextValue = [
  state: AuthContextState,
  actions: {
    /**
     * Load the default identity from secure storage. If the identity is not
     * verified, the registration flow will be automatically resumed.
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
  }
]
```
