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

Provider for an `Uploader` which allows uploads to the service. Note that this provider uses [`useAuth`](./react-keyring#useauth) and provides an `uploader` only when a current identity is loaded.

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
const [progress, uploader] = useUploader()
```

Hook to allow use of the [`UploaderProvider`](#uploaderprovider) value. The value returned is an `UploaderContextValue`:

```ts
type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

interface UploaderContextState {
  uploadedCarChunks: CarChunkMeta[]
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
```

