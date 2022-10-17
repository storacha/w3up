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

[Provider](https://vuejs.org/guide/components/provide-inject.html) for an `Uploader` which allows uploads to the service. Note that _this_ provider injects values from [`AuthProvider`](./vue-keyring#authprovider).

Example:

```vue
<script>
import { AuthProvider } from '@w3ui/vue-keyring'
import { UploaderProvider } from '@w3ui/vue-uploader'

export default {
  components: { AuthProvider, UploaderProvider }
}
</script>

<template>
  <AuthProvider>
    <UploaderProvider>
      <!-- Application pages/components -->
    </UploaderProvider>
  </AuthProvider>
</template>
```

Once mounted, the `UploaderProvider` provides the following injection keys:

```ts
const UploaderProviderInjectionKey = {
  uploadFile: InjectionKey<UploaderContextActions['uploadFile']>,
  uploadDirectory: InjectionKey<UploaderContextActions['uploadDirectory']>,
  uploadCarChunks: InjectionKey<UploaderContextActions['uploadCarChunks']>,
  uploadedCarChunks: InjectionKey<Ref<UploaderContextState['uploadedCarChunks']>>
}

interface UploaderContextActions {
  /**
   * Upload a single file to the service.
   */
  uploadFile: (file: Blob) => Promise<CID>
  /**
   * Upload a directory of files to the service.
   */
  uploadDirectory: (files: File[]) => Promise<CID>
  /**
   * Upload CAR bytes to the service.
   */
  uploadCarChunks: (chunks: AsyncIterable<CarData>) => Promise<void>
}

interface UploaderContextState {
  uploadedCarChunks: CarChunkMeta[]
}
```

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
