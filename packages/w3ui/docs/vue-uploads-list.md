# `@w3ui/vue-uploads-list`

## Install

```sh
npm install @w3ui/vue-uploads-list
```

## Usage

```js
import * as VueUploadsList from '@w3ui/vue-uploads-list'
```

## Exports

* [`UploadsListProvider`](#uploadslistprovider)

---

### `UploadsListProvider`

[Provider](https://vuejs.org/guide/components/provide-inject.html) for a list of items uploaded by the current identity. Note that _this_ provider injects values from [`KeyringProvider`](./vue-keyring#keyringprovider).

Example:

```vue
<script>
import { KeyringProvider } from '@w3ui/vue-keyring'
import { UploadsListProvider } from '@w3ui/vue-uploads-list'

export default {
  components: { UploadsListProvider }
}
</script>

<template>
  <KeyringProvider>
    <UploadsListProvider>
      <!-- Application pages/components -->
    </UploadsListProvider>
  </KeyringProvider>
</template>
```

Once mounted, the `UploadsListProvider` provides the following injection keys:

```ts
type UploadsListProviderInjectionKey = {
  loading: InjectionKey<Ref<UploadsListContextState['loading']>>,
  error: InjectionKey<Ref<UploadsListContextState['error']>>,
  data: InjectionKey<Ref<UploadsListContextState['data']>>,
  next: InjectionKey<UploadsListContextActions['next']>,
  reload: InjectionKey<UploadsListContextActions['reload']>
}
```

See [uploads-list-core.md](./uploads-list-core.md) for the definitions for [`UploadsListContextState`](./uploads-list-core.md#uploadslistcontextstate) and [`UploadsListContextActions`](./uploads-list-core.md#uploadslistcontextactions).

These keys may be used in child components e.g.

```vue
<script>
import { UploadsListProviderInjectionKey } from '@w3ui/vue-uploads-list'

export default {
  inject: {
    data: { from: UploadsListProviderInjectionKey.data }
  }
}
</script>

<template>
  <ul v-if="data != null">
    <li v-for="upload in data.results">{{upload.dataCID}}</li>
  </ul>
</template>
```
