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

* [`encodeDirectory`](#encodedirectory)
* [`encodeFile`](#encodefile)
* [`uploadCarBytes`](#uploadcarbytes)

---

### `encodeDirectory`

```ts
encodeDirectory (files: Iterable<File>): Promise<{ cid: CID, car: AsyncIterable<Uint8Array> }>
```

Create a UnixFS DAG from the passed file data and serialize to a CAR file. All files are added to a container directory, with paths in file names preserved.

Example:

```js
const { cid, car } = await encodeDirectory([
  new File(['doc0'], 'doc0.txt'),
  new File(['doc1'], 'dir/doc1.txt'),
])
// DAG structure will be:
// bafybei.../doc0.txt
// bafybei.../dir/doc1.txt
```

### `encodeFile`

```ts
encodeFile (file: Blob): Promise<{ cid: CID, car: AsyncIterable<Uint8Array> }>
```

Create a UnixFS DAG from the passed file data and serialize to a CAR file.

Example:

```js
const { cid, car } = await encodeFile(new File(['data'], 'doc.txt'))
// Note: file name is not preserved - use encodeDirectory if required.
```

### `uploadCarBytes`

```ts
uploadCarBytes (principal: SigningPrincipal, bytes: Uint8Array): Promise<void>
```

Upload CAR bytes to the service. The principal can be obtained from [`createIdentity`](./wallet-core#createidentity).
