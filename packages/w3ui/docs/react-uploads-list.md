# `@w3ui/react-uploads-list`

## Install

```sh
npm install @w3ui/react-uploads-list
```

## Usage

```js
import * as ReactUploadsList from '@w3ui/react-uploads-list'
```

## Exports

* [`UploadsList`](#uploadslist)
  * [`UploadsList.NextButton`](#uploadslistnextbutton)
  * [`UploadsList.ReloadButton`](#uploadslistreloadbutton)
* [`UploadsListProvider`](#uploadslistprovider)
* [`useUploadsList`](#useuploadslist)

---

### `UploadsList`

Top-level component of the headless UploadsList.

Designed to be used with [`UploadsList.NextButton`](#uploadslistnextbutton), [`UploadsList.ReloadButton`](#uploadslistreloadbutton), etc to easily create a custom component for listing uploads in a web3.storage space.

Must be used inside of an [`UploadsListProvider`](#uploadslistprovider).

#### `UploadsList.NextButton`

Button that loads the next page of results in an UploadsList.

Renders a `button` element designed to be used inside of an [`UploadsList`](#uploadslist). When pressed, will request the next page of uploads from the service.

Any passed props will be passed along to the `button` element.

#### `UploadsList.ReloadButton`

Button that reloads an UploadsList.

Renders a `button` element designed to be used inside of an [`UploadsList`](#uploadslist). When pressed, will reload list data from the service.

Any passed props will be passed along to the `button` element.

### `UploadsListProvider`

Provider for a list of items uploaded by the current agent. Note that this provider uses [`useKeyring`](./react-keyring.md#usekeyring) to obtain the current agent's identity.

Example:

```jsx
import { UploadsListProvider } from '@w3ui/react-uploads-list'

function App () {
  return (
    <UploadsListProvider>
      {/* Application pages/components */}
    </UploadsListProvider>
  )
}
```

You can optionally target a non-production instance of the upload service by setting the `servicePrincipal` and `connection` props on `UploadsListProvider`. The `servicePrincipal` should be set to the service's DID, and `connection` should be a ucanto `ConnectionView` to the service instance.

### `useUploadsList`

```ts
const [uploadsListState, uploadsListActions] = useUploadsList()
```

Hook to allow use of the [`UploadsListProvider`](#uploadslistprovider) value. The value returned is an `UploaderContextValue`:

```ts
export type UploadsListContextValue = [
  state: UploadsListContextState,
  actions: UploadsListContextActions
]
```

See [uploads-list-core.md](./uploads-list-core.md) for the definitions for [`UploadsListContextState`](./uploads-list-core.md#uploadslistcontextstate) and [`UploadsListContextActions`](./uploads-list-core.md#uploadslistcontextactions).
