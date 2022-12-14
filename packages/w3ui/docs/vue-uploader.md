# `@w3ui/vue-uploader`

## Install

```sh
npm install @w3ui/vue-uploader
```

## Usage

```js
import * as VueUploader from '@w3ui/vue-uploader'
```

## Exports

* [`UploaderProvider`](#uploaderprovider)

---

### `UploaderProvider`

[Provider](https://vuejs.org/guide/components/provide-inject.html) for an `Uploader` which allows uploads to the service. Note that _this_ provider injects values from [`KeyringProvider`](./vue-keyring#keyringprovider).

Example:

```vue
<script>
import { KeyringProvider } from '@w3ui/vue-keyring'
import { UploaderProvider } from '@w3ui/vue-uploader'

export default {
  components: { KeyringProvider, UploaderProvider }
}
</script>

<template>
  <KeyringProvider>
    <UploaderProvider>
      <!-- Application pages/components -->
    </UploaderProvider>
  </KeyringProvider>
</template>
```

Once mounted, the `UploaderProvider` provides the following injection keys:

```ts
type UploaderProviderInjectionKey = {
  uploadFile: InjectionKey<UploaderContextActions['uploadFile']>,
  uploadDirectory: InjectionKey<UploaderContextActions['uploadDirectory']>,
  storedDAGShards: InjectionKey<Ref<UploaderContextState['storedDAGShards']>>
}
```

See [uploader-core.md](./uploader-core.md) for the definitions for [`UploaderContextState`](./uploader-core.md#uploadercontextstate) and [`UploaderContextActions`](./uploader-core.md#uploadercontextactions).

These keys may be used in child components e.g.

```vue
<script>
import { UploaderProviderInjectionKey } from '@w3ui/vue-uploader'

export default {
  inject: {
    uploadFile: { from: UploaderProviderInjectionKey.uploadFile }
  },
  data () {
    return { file: null }
  },
  methods: {
    async handleUploadSubmit (e) {
      e.preventDefault()
      const cid = await this.uploadFile(this.file)
      console.log('Data CID:', cid.toString())
    },
    handleFileChange (e) {
      e.preventDefault()
      this.file = e.target.files[0]
    }
  }
}
</script>

<template>
  <form @submit="handleUploadSubmit">
    <div className='db mb3'>
      <label htmlFor='file'>File:</label>
      <input id='file' type='file' @change="handleFileChange" required />
    </div>
    <button type='submit'>Upload</button>
  </form>
</template>
```
