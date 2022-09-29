# `@w3ui/vue-wallet`

## Install

```sh
npm install @w3ui/vue-wallet
```

## Usage

```js
import * as VueWallet from '@w3ui/vue-wallet'
```

## Exports

* [`AuthProvider`](#authprovider)

---

### `AuthProvider`

[Provider](https://vuejs.org/guide/components/provide-inject.html) for authentication with the service.

Example:

```vue
<script>
import { AuthProvider } from '@w3ui/vue-wallet'

export default {
  components: { AuthProvider }
}
</script>

<template>
  <AuthProvider>
    <!-- Application pages/components -->
  </AuthProvider>
</template>
```

Once mounted, the `AuthProvider` provides the following injection keys:

```ts
type AuthProviderInjectionKey = {
  identity: InjectionKey<ComputedRef<AuthContextState['identity']>>
  status: InjectionKey<ComputedRef<AuthContextState['status']>>
  loadDefaultIdentity: InjectionKey<AuthContextActions['loadDefaultIdentity']>
  cancelRegisterAndStoreIdentity: InjectionKey<AuthContextActions['cancelRegisterAndStoreIdentity']>
  registerAndStoreIdentity: InjectionKey<AuthContextActions['registerAndStoreIdentity']>
  unloadIdentity: InjectionKey<AuthContextActions['unloadIdentity']>
  unloadAndRemoveIdentity: InjectionKey<AuthContextActions['unloadAndRemoveIdentity']>
}

interface AuthContextState {
  /**
   * The current identity
   */
  identity?: Identity
  /**
   * Authentication status of the current identity.
   */
  status: AuthStatus
}

interface AuthContextActions {
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
```

These keys may be used in child components e.g.

```vue
<script>
import { AuthProviderInjectionKey } from '@w3ui/vue-wallet'

export default {
  inject: {
    identity: { from: AuthProviderInjectionKey.identity }
  }
}
</script>

<template>
  <p v-if="identity != null">{{identity.email}}</p>
</template>
```
