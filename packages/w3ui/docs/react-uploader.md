# `@w3ui/react-uploader`

## Install

```sh
npm install @w3ui/react-uploader
```

## Usage

```js
import * as ReactUploader from '@w3ui/react-uploader'
```

## Exports

* [`UploaderProvider`](#uploaderprovider)
* [`useUploader`](#useuploader)

---

### `UploaderProvider`

Provider for an `Uploader` which allows uploads to the service. Note that this provider uses [`useAuth`](./react-wallet#useauth) and provides an `uploader` only when a current identity is loaded.

Example:

```jsx
import { UploaderProvider } from '@w3ui/react-uploader'

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
const { uploader } = useUploader()
// Provides a value when an identity is loaded via react-wallet auth provider.
if (!uploader) return
```

Hook to allow use of the [`UploaderProvider`](#uploaderprovider) value. The value returned is an `UploaderContextValue`:

```ts
interface UploaderContextValue {
  uploader?: Uploader
}

interface Uploader {
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
```

