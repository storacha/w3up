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

Provider for an `Uploader` which allows uploads to the service. Note that this provider uses [`useKeyring`](./react-keyring#usekeyring) and provides an `uploader` only when an Agent with a registered space is loaded.

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

You can optionally target a non-production instance of the upload service by setting the `servicePrincipal` and `connection` props on `UploaderProvider`. The `servicePrincipal` should be set to the service's DID, and `connection` should be a ucanto `ConnectionView` to the service instance.

### `useUploader`

```ts
const [uploaderState, uploaderActions] = useUploader()
```

Hook to allow use of the [`UploaderProvider`](#uploaderprovider) value. The value returned is an `UploaderContextValue`:

```ts
type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]
```

See [uploader-core.md](./uploader-core.md) for the definitions for [`UploaderContextState`](./uploader-core.md#uploadercontextstate) and [`UploaderContextActions`](./uploader-core.md#uploadercontextactions).