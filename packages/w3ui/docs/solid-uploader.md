# `@w3ui/solid-uploader`

## Install

```sh
npm install @w3ui/solid-uploader
```

## Usage

```js
import * as SolidUploader from '@w3ui/solid-uploader'
```

## Exports

* [`UploaderProvider`](#uploaderprovider)
* [`useUploader`](#useuploader)

---

### `UploaderProvider`

Provider for an `Uploader` which allows uploads to the service. Note that this provider uses [`useAuth`](./solid-wallet#useauth) and provides an `uploader` that allows uploads only when a current identity is loaded.

Example:

```jsx
import { UploaderProvider } from '@w3ui/solid-uploader'

function App () {
  return (
    <UploaderProvider>
      {/* Application pages/components */}
    </UploaderProvider>
  )
}
```

### `useUploader`

```ts
const [, uploader] = useUploader()
```

Hook to allow use of the [`UploaderProvider`](#uploaderprovider) value. The value returned is an `UploaderContextValue`:

```ts
type UploaderContextValue = [
  state: {},
  actions: {
    /**
     * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
     */
    encodeFile: (file: Blob) => Promise<{ cid: CID, car: AsyncIterable<Uint8Array> }>
    /**
     * Create a UnixFS DAG from the passed file data and serialize to a CAR file.
     * All files are added to a container directory, with paths in file names
     * preserved.
     */
    encodeDirectory: (files: Iterable<File>) => Promise<{ cid: CID, car: AsyncIterable<Uint8Array> }>
    /**
     * Upload CAR bytes to the service.
     */
    uploadCar: (car: AsyncIterable<Uint8Array>) => Promise<void>
  }
]
```
