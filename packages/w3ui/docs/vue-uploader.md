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

[Provider](https://vuejs.org/guide/components/provide-inject.html) for an `Uploader` which allows uploads to the service. Note that _this_ provider injects values from [`AuthProvider`](./vue-wallet#authprovider).

Example:

```vue
<script>
import { AuthProvider } from '@w3ui/vue-wallet'
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
type UploaderProviderInjectionKey = {
  encodeFile: InjectionKey<UploaderContextActions['encodeFile']>
  encodeDirectory: InjectionKey<UploaderContextActions['encodeDirectory']>
  uploadCar: InjectionKey<UploaderContextActions['uploadCar']>
}

interface UploaderContextActions {
  /**
   * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
   */
  encodeFile: (data: Blob) => Promise<EncodeResult>
  /**
   * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
   * All files are added to a container directory, with paths in file names
   * preserved.
   */
  encodeDirectory: (files: Iterable<File>) => Promise<EncodeResult>
  /**
   * Upload CAR bytes to the service.
   */
  uploadCar: (car: AsyncIterable<Uint8Array>) => Promise<void>
}
```

These keys may be used in child components e.g.

```vue
<script>
import { UploaderProviderInjectionKey } from '@w3ui/vue-uploader'

export default {
  inject: {
    encodeFile: { from: UploaderProviderInjectionKey.encodeFile },
    uploadCar: { from: UploaderProviderInjectionKey.uploadCar }
  },
  data () {
    return { file: null }
  },
  methods: {
    async handleUploadSubmit (e) {
      e.preventDefault()
      // Build a DAG from the file data to obtain the root CID.
      const { cid, car } = await this.encodeFile(this.file)
      console.log('Data CID:', cid.toString())
      // Upload the DAG to the service.
      await this.uploadCar(car)
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
