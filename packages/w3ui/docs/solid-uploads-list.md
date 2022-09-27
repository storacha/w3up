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
function createUploadsListResource (source: ResourceSource<Identity>, options?: ResourceOptions<CID[], Identity>): ResourceReturn<CID[]>
```

Create a solid resource configured to fetch data from the service. Please see the docs for [`createResource`](https://www.solidjs.com/docs/latest/api#createresource) for parameter and return type descriptions.

Example:

```jsx
import { AuthProvider } from '@w3ui/solid-wallet'
import { createUploadsListResource } from '@w3ui/solid-uploads-list'

function App () {
  return (
    <AuthProvider>
      <List />
    </AuthProvider>
  )
}

function List () {
  const [auth] = useAuth()
  const [data] = createUploadsListResource(() => auth.identity, { initialValue: [] })
  return (
    <table className='mb3'>
      {data().map(cid => <tr key={cid}><td>{cid}</td></tr>)}
    </table>
  )
}
```
