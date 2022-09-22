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

* [`listUploads`](#listuploads)

---

### `listUploads`

```ts
listUploads (principal: SigningPrincipal, options: { signal?: AbortSignal } = {}): Promise<CID[]>
```

List CIDs of uploaded CAR files.

Example:

```js
const controller = new AbortController()
const cids = await listUploads(identity.signingPrincipal, { signal: controller.signal })
```
