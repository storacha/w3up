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

[Provider](https://vuejs.org/guide/components/provide-inject.html) for a list of items uploaded by the current identity. Note that _this_ provider injects values from [`AuthProvider`](./vue-keyring#authprovider).

Example:

```vue
<script>
import { UploadsListProvider } from '@w3ui/vue-keyring'

export default {
  components: { UploadsListProvider }
}
</script>

<template>
  <UploadsListProvider>
    <!-- Application pages/components -->
  </UploadsListProvider>
</template>
```

Once mounted, the `UploadsListProvider` provides the following injection keys:

```ts
type UploadsListProviderInjectionKey = {
  loading: InjectionKey<Ref<UploadsListContextState['loading']>>,
  error: InjectionKey<Ref<UploadsListContextState['error']>>,
  data: InjectionKey<Ref<UploadsListContextState['data']>>,
  reload: InjectionKey<UploadsListContextActions['reload']>
}

interface UploadsListContextState {
  /**
   * True if the uploads list is currently being retrieved from the service.
   */
  loading: boolean
  /**
   * Set if an error occurred retrieving the uploads list.
   */
  error?: Error
  /**
   * The content of the uploads list.
   */
  data?: ListPage
}

interface UploadsListContextActions {
  /**
   * Call to reload the uploads list.
   */
  reload: () => Promise<void>
}
```

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
    <li v-for="upload in data.results">{{upload.dataCid}}</li>
  </ul>
</template>
```
