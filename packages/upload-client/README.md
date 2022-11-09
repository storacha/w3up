<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The upload client for <a href="https://web3.storage">https://web3.storage</a></p>

## Install

Install the package using npm:

```console
npm install @web3-storage/upload-client
```

## Usage

[API Reference](#api)

TODO: how to obtain account/signer

### Uploading files

```js
import { uploadFile } from '@web3-storage/upload-client'

const cid = await uploadFile(account, signer, new Blob(['Hello World!']))
```

```js
import { uploadDirectory } from '@web3-storage/upload-client'

const cid = await uploadDirectory(account, signer, [
  new File(['doc0'], 'doc0.txt'),
  new File(['doc1'], 'dir/doc1.txt'),
])

// Note: you can use https://npm.im/files-from-path to read files from the
// filesystem in Nodejs.
```

### Advanced usage

#### Buffering API

The buffering API loads all data into memory so is suitable only for small files. The root data CID is obtained before any transfer to the service takes place.

```js
import { UnixFS, CAR, Storage } from '@web3-storage/upload-client'

// Encode a file as a DAG, get back a root data CID and a set of blocks
const { cid, blocks } = await UnixFS.encodeFile(file)
// Encode the DAG as a CAR file
const car = await CAR.encode(blocks, cid)
// Store the CAR file to the service
const carCID = await Storage.store(account, signer, car)
// Register an "upload" - a root CID contained within the passed CAR file(s)
await Storage.registerUpload(account, signer, cid, [carCID])
```

#### Streaming API

This API offers streaming DAG generation, allowing CAR "shards" to be sent to the service as the DAG is built. It allows files and directories of arbitrary size to be sent to the service while keeping within memory limits of the device. The _last_ CAR file sent contains the root data CID.

```js
import {
  UnixFS,
  ShardingStream,
  ShardStoringStream,
  Storage,
} from '@web3-storage/upload-client'

const cars = []
// Encode a file as a DAG, get back a readable stream of blocks.
await UnixFS.createFileEncoderStream(file)
  // Pipe blocks to a stream that yields CARs files - shards of the DAG.
  .pipeThrough(new ShardingStream())
  // Pipe CARs to a stream that stores them to the service and yields metadata
  // about the CARs that were stored.
  .pipeThrough(new ShardStoringStream(account, issuer))
  // Collect the metadata, we're mostly interested in the CID of each CAR file
  // and the root data CID (which can be found in the _last_ CAR file).
  .pipeTo(
    new WritableStream({
      write: (car) => {
        cars.push(car)
      },
    })
  )

// The last CAR stored contains the root data CID
const rootCID = cars[cars.length - 1].roots[0]
const carCIDs = cars.map((car) => car.cid)

// Register an "upload" - a root CID contained within the passed CAR file(s)
await Storage.registerUpload(account, signer, rootCID, carCIDs)
```

## API

- `CAR`
  - [`encode`](#carencode)
- [`ShardingStream`](#shardingstream)
- [`ShardStoringStream`](#shardstoringstream)
- `Storage`
  - [`registerUpload`](#storageregisterupload)
  - [`store`](#storagestoredag)
- `UnixFS`
  - [`createDirectoryEncoderStream`](#unixfscreatedirectoryencoderstream)
  - [`createFileEncoderStream`](#unixfscreatefileencoderstream)
  - [`encodeDirectory`](#unixfsencodedirectory)
  - [`encodeFile`](#unixfsencodefile)
- [`uploadDirectory`](#uploaddirectory)
- [`uploadFile`](#uploadfile)

---

### `CAR.encode`

```ts
function encode(blocks: Iterable<Block>, root?: CID): Promise<CARFile>
```

Encode a DAG as a CAR file.

Note: `CARFile` is just a `Blob` with two extra properties:

```ts
type CARFile = Blob & { version: 1; roots: CID[] }
```

Example:

```js
const { cid, blocks } = await UnixFS.encodeFile(new Blob(['data']))
const car = await CAR.encode(blocks, cid)
```

### `ShardingStream`

```ts
class ShardingStream extends TransformStream<Block, CARFile>
```

Shard a set of blocks into a set of CAR files. The last block written to the stream is assumed to be the DAG root and becomes the CAR root CID for the last CAR output.

Note: `CARFile` is just a `Blob` with two extra properties:

```ts
type CARFile = Blob & { version: 1; roots: CID[] }
```

### `ShardStoringStream`

```ts
class ShardStoringStream extends TransformStream<CARFile, CARMetadata>
```

Stores multiple DAG shards (encoded as CAR files) to the service.

Note: an "upload" must be registered in order to link multiple shards together as a complete upload.

The writeable side of this transform stream accepts `CARFile`s and the readable side yields `CARMetadata`, which contains the CAR CID, it's size (in bytes) and it's roots (if it has any).

### `Storage.registerUpload`

```ts
function registerUpload(
  account: DID,
  signer: Signer,
  root: CID,
  shards: CID[],
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Register a set of stored CAR files as an "upload" in the system. A DAG can be split between multipe CAR files. Calling this function allows multiple stored CAR files to be considered as a single upload.

### `Storage.store`

```ts
function store(
  account: DID,
  signer: Signer,
  car: Blob,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<CID>
```

Store a CAR file to the service.

### `UnxiFS.createDirectoryEncoderStream`

```ts
function createDirectoryEncoderStream(
  files: Iterable<File>
): ReadableStream<Block>
```

Creates a `ReadableStream` that yields UnixFS DAG blocks. All files are added to a container directory, with paths in file names preserved.

Note: you can use https://npm.im/files-from-path to read files from the filesystem in Nodejs.

### `UnxiFS.createFileEncoderStream`

```ts
function createFileEncoderStream(file: Blob): ReadableStream<Block>
```

Creates a `ReadableStream` that yields UnixFS DAG blocks.

### `UnxiFS.encodeDirectory`

```ts
function encodeDirectory(
  files: Iterable<File>
): Promise<{ cid: CID; blocks: Block[] }>
```

Create a UnixFS DAG from the passed file data. All files are added to a container directory, with paths in file names preserved.

Note: you can use https://npm.im/files-from-path to read files from the filesystem in Nodejs.

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

### `UnxiFS.encodeFile`

```ts
function encodeFile(file: Blob): Promise<{ cid: CID; blocks: Block[] }>
```

Create a UnixFS DAG from the passed file data.

Example:

```js
const { cid, blocks } = await encodeFile(new File(['data'], 'doc.txt'))
// Note: file name is not preserved - use encodeDirectory if required.
```

### `uploadDirectory`

```ts
function uploadDirectory(
  account: DID,
  signer: Signer,
  files: File[],
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored: ShardStoredCallback
  } = {}
): Promise<CID>
```

Uploads a directory of files to the service and returns the root data CID for the generated DAG. All files are added to a container directory, with paths in file names preserved.

### `uploadFile`

```ts
function uploadFile(
  account: DID,
  signer: Signer,
  file: Blob,
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored: ShardStoredCallback
  } = {}
): Promise<CID>
```

Uploads a file to the service and returns the root data CID for the generated DAG.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)
