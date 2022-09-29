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

* [`UploadsListProvider`](#uploadslistprovider)
* [`useUploadsList`](#useuploadslist)

---

### `UploadsListProvider`

Provider for a list of items uploaded by the current identity. Note that this provider uses [`useAuth`](./react-wallet#useauth) to obtain the current identity.

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

### `useUploadsList`

```ts
const { data, loading, error, reload } = useUploadsList()
```

Hook to allow use of the [`UploadsListProvider`](#uploadslistprovider) value. The value returned is an `UploaderContextValue`:

```ts
interface UploadsListContextValue {
  /**
   * True if the uploads list is currentky being retrieved from the service.
   */
  loading: boolean
  /**
   * Set if an error occurred retrieving the uploads list.
   */
  error?: Error
  /**
   * The content of the uploads list.
   */
  data?: ListPage
  /**
   * Call to reload the uploads list.
   */
  reload: () => Promise<void>
}

interface ListPage {
    page: number;
    pageSize: number;
    results: ListResult[];
}

interface ListResult {
    dataCid: CID;
    carCids: CID[];
    uploadedAt: Date;
}
```

