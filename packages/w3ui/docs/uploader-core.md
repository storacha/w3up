# `@w3ui/uploader-core`

## Install

```sh
npm install @w3ui/uploader-core
```

## Usage

```js
import * as UploaderCore from '@w3ui/uploader-core'
```

## Exports

**Interfaces**
- [`UploaderContextState`](#uploadercontextstate)
- [`UploaderContextActions`](#uploadercontextactions)

**Functions**
- [`uploadFile`](#uploadfile)
- [`uploadDirectory`](#uploaddirectory)

---

### `UploaderContextState`

Interface containing uploader state. Implementations are framework-specific and found in each framework's `-uploader` module (e.g. `@w3ui/react-uploader`).

```ts
export interface UploaderContextState {
  storedDAGShards: CARMetadata[]
}
```

The [`CARMetadata` type](https://github.com/web3-storage/w3protocol/tree/main/packages/upload-client#carmetadata) is defined by the `@web3-storage/upload-client` package and re-exported by `@w3ui/uploader-core`.

### `UploaderContextActions`

Interface containing upload actions. Implementations are framework-specific and found in each framework's `-uploader` module (e.g. `@w3ui/react-uploader`).

### `uploadFile`

Re-exported [`uploadFile` function](https://github.com/web3-storage/w3protocol/tree/main/packages/upload-client#uploadfile) from `@web3-storage/upload-client`.

### `uploadDirectory`

Re-exported [`uploadDirectory` function](https://github.com/web3-storage/w3protocol/tree/main/packages/upload-client#uploaddirectory) from `@web3-storage/upload-client`.
