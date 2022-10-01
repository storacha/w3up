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
* [`uploadCarChunks`](#uploadcarchunks)
* [`uploadCarBytes`](#uploadcarbytes)

---

### `chunkBlocks`

```ts
chunkBlocks (stream: ReadableStream<Block>, options?: ChunkerOptions): AsyncIterable<CarData>
```

Split a stream of blocks into chunks of CAR files.

```ts
interface ChunkerOptions {
  /**
   * The target chunk size. Actual size of CAR output may be bigger due to
   * CAR header and block encoding data.
   */
  chunkSize?: number
}
```

### `encodeDirectory`

```ts
encodeDirectory (files: Iterable<File>): { cid: Promise<CID>, blocks: ReadableStream<Block> }
```

Create a UnixFS DAG from the passed file data. All files are added to a container directory, with paths in file names preserved.

Example:

```js
const { cid, blocks } = encodeDirectory([
  new File(['doc0'], 'doc0.txt'),
  new File(['doc1'], 'dir/doc1.txt'),
])
// DAG structure will be:
// bafybei.../doc0.txt
// bafybei.../dir/doc1.txt
```

### `encodeFile`

```ts
encodeFile (file: Blob): { cid: Promise<CID>, blocks: AsyncIterable<CarData> }
```

Create a UnixFS DAG from the passed file data.

Example:

```js
const { cid, blocks } = await encodeFile(new File(['data'], 'doc.txt'))
// Note: file name is not preserved - use encodeDirectory if required.
```

### `uploadCarChunks`

```ts
uploadCarChunks (principal: SigningPrincipal, chunks: AsyncIterable<CarData>, options?: UploadCarChunksOptions): Promise<CID[]>
```

Upload multiple CAR chunks to the service, linking them together after successful completion. Returns an array of CIDs of the CARs that were uploaded.

```ts
interface UploadCarChunksOptions {
  retries?: number
  onChunkUploaded?: (event: { meta: CarChunkMeta }) => void
}

interface CarChunkMeta {
  /**
   * CID of the CAR file (not the data it contains).
   */
  cid: CID
  /**
   * Size of the CAR file in bytes.
   */
  size: number
}
```

### `uploadCarBytes`

```ts
uploadCarBytes (principal: SigningPrincipal, bytes: Uint8Array): Promise<void>
```

Upload CAR bytes to the service. The principal can be obtained from [`createIdentity`](./wallet-core#createidentity).
