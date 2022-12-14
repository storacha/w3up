# `@w3ui/uploads-list-core`

## Install

```sh
npm install @w3ui/uploads-list-core
```

## Usage

```js
import * as UploadsListCore from '@w3ui/uploads-list-core'
```

## Exports

**Interfaces**
- [`UploadsListContextState`](#uploadslistcontextstate)
- [`UploadsListContextActions`](#uploadslistcontextactions)

**Functions**
* [`list`](#list)

---

### `UploadsListContextState`

Interface containing uploads list state. Implementations are framework-specific and found in each framework's `-uploads-list` module (e.g. `@w3ui/react-uploads-list`).

```ts
export interface UploadsListContextState {
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
  data?: UploadListResult[]
}
```

The `UploadListResult` type is re-exported from `@web3-storage/upload-client` and has the following shape:

```ts
export interface UploadListResult {
  uploaderDID: string
  dataCID: string
  carCID: string
  uploadedAt: string
}
```

### `UploadsListContextActions`

Interface containing upload listing actions. Implementations are framework-specific and found in each framework's `-uploads-list` module (e.g. `@w3ui/react-uploads-list`).

```ts
export interface UploadsListContextActions {
  /**
   * Load the next page of results.
   */
  next: () => Promise<void>
  /**
   * Call to reload the uploads list (discarding the current page).
   */
  reload: () => Promise<void>
}
```

### `list`

Re-exported [`Upload.list` function](https://github.com/web3-storage/w3protocol/tree/main/packages/upload-client#uploadlist) from `@web3-storage/upload-client`.
