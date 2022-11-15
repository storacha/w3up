<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The upload client for <a href="https://web3.storage">https://web3.storage</a></p>

## Install

Install the package using npm:

```console
npm install @web3-storage/upload-client
```

## Usage

[API Reference](#api)

### Create an Agent

An Agent provides an `issuer` (a key linked to your account) and `proofs` to show your `issuer` has been delegated the capabilities to store data and register uploads. 

```js
import { Agent } from '@web3-storage/access-client'
import { add as storeAdd } from '@web3-storage/access-client/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access-client/capabilities/upload'

const agent = await Agent.create({ store })

// Note: you need to create and register an account 1st time:
// await agent.createAccount('you@youremail.com')

const conf = {
  issuer: agent.issuer,
  proofs: agent.getProofs([storeAdd, uploadAdd]),
}
```

### Uploading files

Once you have the `issuer` and `proofs`, you can upload a directory of files by passing that invocation config to `uploadDirectory` along with your list of files to upload. 

You can get your list of Files from a [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) element in the browser or using [`files-from-path`](https://npm.im/files-from-path) in Node.js

```js
import { uploadFile } from '@web3-storage/upload-client'

const cid = await uploadFile(conf, new Blob(['Hello World!']))
```

```js
import { uploadDirectory } from '@web3-storage/upload-client'

const cid = await uploadDirectory(conf, [
  new File(['doc0'], 'doc0.txt'),
  new File(['doc1'], 'dir/doc1.txt'),
])
```

### Advanced usage

#### Buffering API

The buffering API loads all data into memory so is suitable only for small files. The root data CID is derived from the data before any transfer to the service takes place.

```js
import { UnixFS, CAR, Store, Upload } from '@web3-storage/upload-client'

// Encode a file as a DAG, get back a root data CID and a set of blocks
const { cid, blocks } = await UnixFS.encodeFile(file)
// Encode the DAG as a CAR file
const car = await CAR.encode(blocks, cid)
// Store the CAR file to the service
const carCID = await Store.add(conf, car)
// Register an "upload" - a root CID contained within the passed CAR file(s)
await Upload.add(conf, cid, [carCID])
```

#### Streaming API

This API offers streaming DAG generation, allowing CAR "shards" to be sent to the service as the DAG is built. It allows files and directories of arbitrary size to be sent to the service while keeping within memory limits of the device. The _last_ CAR file sent contains the root data CID.

```js
import {
  UnixFS,
  ShardingStream,
  ShardStoringStream,
  Upload,
} from '@web3-storage/upload-client'

const metadatas = []
// Encode a file as a DAG, get back a readable stream of blocks.
await UnixFS.createFileEncoderStream(file)
  // Pipe blocks to a stream that yields CARs files - shards of the DAG.
  .pipeThrough(new ShardingStream())
  // Pipe CARs to a stream that stores them to the service and yields metadata
  // about the CARs that were stored.
  .pipeThrough(new ShardStoringStream(conf))
  // Collect the metadata, we're mostly interested in the CID of each CAR file
  // and the root data CID (which can be found in the _last_ CAR file).
  .pipeTo(
    new WritableStream({
      write: (meta) => {
        metadatas.push(meta)
      },
    })
  )

// The last CAR stored contains the root data CID
const rootCID = metadatas.at(-1).roots[0]
const carCIDs = metadatas.map((meta) => meta.cid)

// Register an "upload" - a root CID contained within the passed CAR file(s)
await Upload.add(conf, rootCID, carCIDs)
```

## API

- `CAR`
  - [`encode`](#carencode)
- [`ShardingStream`](#shardingstream)
- [`ShardStoringStream`](#shardstoringstream)
- `Store`
  - [`add`](#storeadd)
  - [`list`](#storelist)
  - [`remove`](#storeremove)
- `UnixFS`
  - [`createDirectoryEncoderStream`](#unixfscreatedirectoryencoderstream)
  - [`createFileEncoderStream`](#unixfscreatefileencoderstream)
  - [`encodeDirectory`](#unixfsencodedirectory)
  - [`encodeFile`](#unixfsencodefile)
- `Upload`
  - [`add`](#uploadadd)
  - [`list`](#uploadlist)
  - [`remove`](#uploadremove)
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

### `Store.add`

```ts
function add(
  conf: InvocationConfig,
  car: Blob,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<CID>
```

Store a CAR file to the service.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `store/add`

### `Store.list`

```ts
function list(
  conf: InvocationConfig,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<StoreListResult>>
```

List CAR files stored by the issuer.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `store/list`

### `Store.remove`

```ts
function remove(
  conf: InvocationConfig,
  link: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a stored CAR file by CAR CID.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `store/remove`

### `UnixFS.createDirectoryEncoderStream`

```ts
function createDirectoryEncoderStream(
  files: Iterable<File>
): ReadableStream<Block>
```

Creates a `ReadableStream` that yields UnixFS DAG blocks. All files are added to a container directory, with paths in file names preserved.

Note: you can use https://npm.im/files-from-path to read files from the filesystem in Nodejs.

### `UnixFS.createFileEncoderStream`

```ts
function createFileEncoderStream(file: Blob): ReadableStream<Block>
```

Creates a `ReadableStream` that yields UnixFS DAG blocks.

### `UnixFS.encodeDirectory`

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

### `UnixFS.encodeFile`

```ts
function encodeFile(file: Blob): Promise<{ cid: CID; blocks: Block[] }>
```

Create a UnixFS DAG from the passed file data.

Example:

```js
const { cid, blocks } = await encodeFile(new File(['data'], 'doc.txt'))
// Note: file name is not preserved - use encodeDirectory if required.
```

### `Upload.add`

```ts
function add(
  conf: InvocationConfig,
  root: CID,
  shards: CID[],
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Register a set of stored CAR files as an "upload" in the system. A DAG can be split between multipe CAR files. Calling this function allows multiple stored CAR files to be considered as a single upload.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `upload/add`

### `Upload.list`

```ts
function list(
  conf: InvocationConfig,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<UploadListResult>>
```

List uploads created by the issuer.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `upload/list`

### `Upload.remove`

```ts
function remove(
  conf: InvocationConfig,
  link: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a upload by root data CID.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `upload/remove`

### `uploadDirectory`

```ts
function uploadDirectory(
  conf: InvocationConfig,
  files: File[],
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored: ShardStoredCallback
  } = {}
): Promise<CID>
```

Uploads a directory of files to the service and returns the root data CID for the generated DAG. All files are added to a container directory, with paths in file names preserved.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `store/add`, `upload/add`

### `uploadFile`

```ts
function uploadFile(
  conf: InvocationConfig,
  file: Blob,
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored: ShardStoredCallback
  } = {}
): Promise<CID>
```

Uploads a file to the service and returns the root data CID for the generated DAG.

Note: `InvocationConfig` is configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Step 0](#step-0) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

Required delegated capability proofs: `store/add`, `upload/add`

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)
