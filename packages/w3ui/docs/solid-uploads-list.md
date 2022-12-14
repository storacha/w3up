# `@w3ui/solid-uploads-list`

## Install

```sh
npm install @w3ui/solid-uploads-list
```

## Usage

```js
import * as SolidUploadsList from '@w3ui/solid-uploads-list'
```

## Exports

* [`createUploadsListResource`](#createuploadslistresource)

---

### `createUploadsListResource`

```ts
function createUploadsListResource (source: ResourceSource<UploadsListSource>, options?: ResourceOptions<ListResponse<UploadListResult>, UploadsListSource>): ResourceReturn<ListResponse<UploadListResult>>
```

Create a solid resource configured to fetch data from the service. Please see the docs for [`createResource`](https://www.solidjs.com/docs/latest/api#createresource) for parameter and return type descriptions.

`createUploadsListResource` takes an `UploadsListSource`:

```ts
interface UploadsListSource extends ServiceConfig {
  cursor?: string
  size?: number
  space: Space,
  agent: Signer,
  getProofs: (caps: Capability[]) => Promise<Proof[]>
}
```

The `space`, `agent`, and `getProofs` fields can be obtained from the `useKeyring` hook.

The `size` field sets the number of results returned in each page.

The `ListResponse` returned by the list resource includes a `cursor` field that can be supplied to set the "starting point" of the next page of results.

Example:

```jsx
import { KeyringProvider, useKeyring } from '@w3ui/solid-keyring'
import { createUploadsListResource } from '@w3ui/solid-uploads-list'

function App () {
  return (
    <KeyringProvider>
      <List />
    </KeyringProvider>
  )
}

function List () {
  const [{ agent, space }, { getProofs }] = useKeyring()
  const [data] = createUploadsListResource({ agent, space, getProofs })
  return (
    <table className='mb3'>
      {data() && data().results.map(({ dataCID }) => (
        <tr key={dataCID}><td>{dataCID}</td></tr>
      ))}
    </table>
  )
}
```
