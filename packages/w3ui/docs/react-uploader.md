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

* [`Uploader`](#uploader)
  * [`Uploader.Form`](#uploaderform)
  * [`Uploader.Input`](#uploaderinput)
* [`UploaderProvider`](#uploaderprovider)
* [`useUploader`](#useuploader)

---

### `Uploader`

Top-level component of the headless Uploader.

Designed to be used with [`Uploader.Form`](#uploaderform) and [`Uploader.Input`](#uploaderinput) to easily create a custom component for uploading files to web3.storage.

Must be used inside of an [`UploaderProvider`](#uploaderprovider).

#### `Uploader.Form`

Form component for the headless Uploader.

Renders a `form` element designed to be used inside of an [`Uploader`](#uploader) that will send files from an [`Uploader.Input`](#uploaderinput) component to the web3.storage service when the form is submitted.

Any passed props will be passed along to the `input` element.

#### `Uploader.Input`

Input component for the headless Uploader.

Renders a file `input` element designed to be used inside of an [`Uploader`](#uploader). When used inside of an [`Uploader.Form`](#uploaderform), files added to the input will be uploaded when the form is submitted.

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