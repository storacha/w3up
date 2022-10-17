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

Provider for an `Uploader` which allows uploads to the service. Note that this provider uses [`useAuth`](./solid-keyring#useauth) and provides an `uploader` that allows uploads only when a current identity is loaded.

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
const [progress, uploader] = useUploader()
```

Hook to allow use of the [`UploaderProvider`](#uploaderprovider) value. The value returned is an `UploaderContextValue`:

```ts
export type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

export interface UploaderContextState {
  uploadedCarChunks: CarChunkMeta[]
}

export interface UploaderContextActions {
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
