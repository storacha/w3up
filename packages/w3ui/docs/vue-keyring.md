# `@w3ui/vue-keyring`

## Install

```sh
npm install @w3ui/vue-keyring
```

## Usage

```js
import * as VueKeyring from '@w3ui/vue-keyring'
```

## Exports

* [`KeyringProvider`](#keyringprovider)

---

### `KeyringProvider`

[Provider](https://vuejs.org/guide/components/provide-inject.html) for authentication with the service.

Example:

```vue
<script>
import { KeyringProvider } from '@w3ui/vue-keyring'

export default {
  components: { KeyringProvider }
}
</script>

<template>
  <KeyringProvider>
    <!-- Application pages/components -->
  </KeyringProvider>
</template>
```

Once mounted, the `KeyringProvider` provides the following injection keys:

```ts
type KeyringProviderInjectionKey = {
  account: InjectionKey<Ref<KeyringContextState['account']>>,
  space: InjectionKey<Ref<KeyringContextState['space']>>,
  spaces: InjectionKey<Ref<KeyringContextState['spaces']>>,
  agent: InjectionKey<Ref<KeyringContextState['agent']>>,
  loadAgent: InjectionKey<KeyringContextActions['loadAgent']>,
  unloadAgent: InjectionKey<KeyringContextActions['unloadAgent']>,
  resetAgent: InjectionKey<KeyringContextActions['resetAgent']>,
  createSpace: InjectionKey<KeyringContextActions['createSpace']>,
  setCurrentSpace: InjectionKey<KeyringContextActions['setCurrentSpace']>,
  registerSpace: InjectionKey<KeyringContextActions['registerSpace']>,
  authorize: InjectionKey<KeyringContextActions['authorize']>,
  cancelAuthorize: InjectionKey<KeyringContextActions['cancelAuthorize']>,
  getProofs: InjectionKey<KeyringContextActions['getProofs']>
}
```

See [keyring-core.md](./keyring-core.md) for the definitions for [`KeyringContextState`](./keyring-core.md#keyringcontextstate) and [`KeyringContextActions`](./keyring-core.md#keyringcontextactions).

These keys may be used in child components e.g.

```vue
<script>
import { KeyringProviderInjectionKey } from '@w3ui/vue-keyring'

export default {
  inject: {
    agent: { from: KeyringProviderInjectionKey.agent }
  }
}
</script>

<template>
  <p v-if="agent != null">{{agent.did()}}</p>
</template>
```
