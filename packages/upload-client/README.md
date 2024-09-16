<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The upload client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/upload-client` package provides the "low level" client API for uploading data to [web3.storage](https://web3.storage) using the w3up platform.

Most users will be better served by the higher-level [`@web3-storage/w3up-client` package](https://github.com/storacha/w3up-client), which presents a simpler API and supports creating agents and registering spaces.

If you are using this package directly instead of `w3up-client`, you will also need to use the [`@web3-storage/access` client](https://github.com/storacha/w3up/tree/main/packages/access-client) for agent and space management. The `@web3-storage/capabilities` package referenced in the examples below is a transitive dependency of both `@web3-storage/upload-client` and `@web3-storage/access`, so you shouldn't need to install it explicitly.

## Install

Install the package using npm:

```bash
npm install @web3-storage/upload-client
```

## Usage

[API Reference](#api)

### Create an agent

An agent provides:

1. The key pair used to call the service and sign the payload (the `issuer`).
2. A decentralized identifier (DID) of the "space" where data should be uploaded (the `with`).
3. Proof showing your `issuer` has been delegated capabilities to store data and register uploads to the "space" (`proofs`).

```js
import { Agent } from '@web3-storage/access'
import { store } from '@web3-storage/capabilities/store'
import { upload } from '@web3-storage/capabilities/upload'

const agent = await Agent.create()

// Note: you need to create and register a space 1st time:
// await agent.createSpace()
// await agent.registerSpace('you@youremail.com')

const conf = {
  issuer: agent.issuer,
  with: agent.currentSpace(),
  proofs: await agent.proofs([store, upload]),
}
```

See the [`@web3-storage/access` docs](https://web3-storage.github.io/w3up/modules/_web3_storage_access.html) for more about creating and registering spaces.

### Uploading files

Once you have the `issuer`, `with` and `proofs`, you can upload a directory of files by passing that invocation config to `uploadDirectory` along with your list of files to upload.

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
import { UnixFS, CAR, Blob, Index, Upload } from '@web3-storage/upload-client'
import * as BlobIndexUtil from '@web3-storage/blob-index/util'
import * as Link from 'multiformats/link'

// Encode a file as a DAG, get back a root data CID and a set of blocks
const { cid, blocks } = await UnixFS.encodeFile(file)
// Encode the DAG as a CAR file
const car = await CAR.encode(blocks, cid)
// Store the CAR file to the service
const carDigest = await Blob.add(conf, car)
// Create an index
const index = await BlobIndexUtil.fromShardArchives(cid, [new Uint8Array(await car.arrayBuffer())])
// Store the index to the service
const indexDigest = await Blob.add(conf, (await index.archive()).ok)
await Index.add(conf, Link.create(CAR.code, indexDigest))
// Register an "upload" - a root CID contained within the passed CAR file(s)
await Upload.add(conf, cid, [Link.create(CAR.code, carDigest)])
```

#### Streaming API

This API offers streaming DAG generation, allowing CAR "shards" to be sent to the service as the DAG is built. It allows files and directories of arbitrary size to be sent to the service while keeping within memory limits of the device. The _last_ CAR file sent contains the root data CID.

```js
import {
  UnixFS,
  ShardingStream,
  Blob,
  Index,
  Upload,
} from '@web3-storage/upload-client'
import { ShardedDAGIndex } from '@web3-storage/blob-index'

let rootCID, carCIDs
const shardIndexes = []
// Encode a file as a DAG, get back a readable stream of blocks.
await UnixFS.createFileEncoderStream(file)
  // Pipe blocks to a stream that yields CARs files - shards of the DAG.
  .pipeThrough(new ShardingStream())
  // Each chunk written is a CAR file - store it with the service and collect
  // the CID of the CAR shard.
  .pipeTo(
    new WritableStream({
      async write (car) {
        const carDigest = await Blob.add(conf, car)
        carCIDs.push(Link.create(CAR.code, carDigest))

        // add the CAR shard itself to the slices
        meta.slices.set(carDigest, [0, car.size])
        shardIndexes.push(car.slices)

        rootCID = rootCID || car.roots[0]
      },
    })
  )

// Combine the shard indexes to create the complete DAG index
const index = ShardedDAGIndex.create(rootCID)
for (const [i, shard] of carCIDs.entries()) {
  const slices = shardIndexes[i]
  index.shards.set(shard.multihash, slices)
}

// Store the index to the service
const indexDigest = await Blob.add(conf, (await index.archive()).ok)
await Index.add(conf, Link.create(CAR.code, indexDigest))

// Register an "upload" - a root CID contained within the passed CAR file(s)
await Upload.add(conf, rootCID, carCIDs)
```

## API

- [Install](#install)
- [Usage](#usage)
  - [Create an Agent](#create-an-agent)
  - [Uploading files](#uploading-files)
  - [Advanced usage](#advanced-usage)
    - [Buffering API](#buffering-api)
    - [Streaming API](#streaming-api)
- [API](#api)
  - [`uploadDirectory`](#uploaddirectory)
  - [`uploadFile`](#uploadfile)
  - [`uploadCAR`](#uploadcar)
  - [`Blob.add`](#blobadd)
  - [`Blob.list`](#bloblist)
  - [`Blob.remove`](#blobremove)
  - [`CAR.BlockStream`](#carblockstream)
  - [`CAR.encode`](#carencode)
  - [`Index.add`](#indexadd)
  - [`ShardingStream`](#shardingstream)
  - [`UnixFS.createDirectoryEncoderStream`](#unixfscreatedirectoryencoderstream)
  - [`UnixFS.createFileEncoderStream`](#unixfscreatefileencoderstream)
  - [`UnixFS.encodeDirectory`](#unixfsencodedirectory)
  - [`UnixFS.encodeFile`](#unixfsencodefile)
  - [`Upload.add`](#uploadadd)
  - [`Upload.list`](#uploadlist)
  - [`Upload.remove`](#uploadremove)
- [Types](#types)
  - [`CARFile`](#carfile)
  - [`CARMetadata`](#carmetadata)
  - [`DirectoryEntryLinkCallback`](#directoryentrylinkcallback)
  - [`InvocationConfig`](#invocationconfig)
  - [`InvocationConfigurator`](#invocationconfigurator)
  - [`ShardStoredCallback`](#shardstoredcallback)
- [Contributing](#contributing)
- [License](#license)

---

### `uploadDirectory`

```ts
function uploadDirectory(
  conf: InvocationConfig | InvocationConfigurator,
  files: File[],
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored?: ShardStoredCallback
    onDirectoryEntryLink?: DirectoryEntryLinkCallback
    shardSize?: number
    concurrentRequests?: number
  } = {}
): Promise<CID>
```

Uploads a directory of files to the service and returns the root data CID for the generated DAG. All files are added to a container directory, with paths in file names preserved.

Required delegated capability proofs: `blob/add`, `index/add`, `upload/add`, `filecoin/offer`

More information: [`InvocationConfig`](#invocationconfig), [`InvocationConfigurator`](#invocationconfigurator), [`ShardStoredCallback`](#shardstoredcallback)

### `uploadFile`

```ts
function uploadFile(
  conf: InvocationConfig | InvocationConfigurator,
  file: Blob,
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored?: ShardStoredCallback
    shardSize?: number
    concurrentRequests?: number
  } = {}
): Promise<CID>
```

Uploads a file to the service and returns the root data CID for the generated DAG.

Required delegated capability proofs: `blob/add`, `index/add`, `upload/add`, `filecoin/offer`

More information: [`InvocationConfig`](#invocationconfig), [`InvocationConfigurator`](#invocationconfigurator)

### `uploadCAR`

```ts
function uploadCAR(
  conf: InvocationConfig | InvocationConfigurator,
  car: Blob,
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored?: ShardStoredCallback
    shardSize?: number
    concurrentRequests?: number
    rootCID?: CID
  } = {}
): Promise<CID>
```

Uploads a CAR file to the service. The difference between this function and [Blob.add](#blobadd) is that the CAR file is automatically sharded, an index is generated, uploaded and registered (see [`Index.add`](#indexadd)) and finally an "upload" is registered (see [`Upload.add`](#uploadadd)), linking the individual shards. Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.

Required delegated capability proofs: `blob/add`, `index/add`, `upload/add`, `filecoin/offer`

More information: [`InvocationConfig`](#invocationconfig), [`InvocationConfigurator`](#invocationconfigurator), [`ShardStoredCallback`](#shardstoredcallback)

### `Blob.add`

```ts
function add(
  blob: Blob,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<MultihashDigest>
```

Store a blob to the service.

Required delegated capability proofs: `blob/add`

More information: [`InvocationConfig`](#invocationconfig)

### `Blob.list`

```ts
function list(
  conf: InvocationConfig,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<BlobListResult>>
```

List blobs stored in the space.

Required delegated capability proofs: `blob/list`

More information: [`InvocationConfig`](#invocationconfig)

### `Blob.remove`

```ts
function remove(
  conf: InvocationConfig,
  digest: MultihashDigest,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a stored blob by multihash digest.

Required delegated capability proofs: `blob/remove`

More information: [`InvocationConfig`](#invocationconfig)

### `CAR.BlockStream`

```ts
class BlockStream extends ReadableStream<Block>
```

Creates a readable stream of blocks from a CAR file `Blob`.

### `CAR.encode`

```ts
function encode(blocks: Iterable<Block>, root?: CID): Promise<CARFile>
```

Encode a DAG as a CAR file.

More information: [`CARFile`](#carfile)

Example:

```js
const { cid, blocks } = await UnixFS.encodeFile(new Blob(['data']))
const car = await CAR.encode(blocks, cid)
```

### `Index.add`

```ts
function add(
  conf: InvocationConfig,
  index: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<IndexAddResponse>
```

Register an "index" with the service. The `index` CID should be the CID of a CAR file, containing an index ad defined by [w3-index](https://github.com/storacha/specs/blob/main/w3-index.md).

Required delegated capability proofs: `index/add`

More information: [`InvocationConfig`](#invocationconfig)

### `ShardingStream`

```ts
class ShardingStream extends TransformStream<Block, CARFile>
```

Shard a set of blocks into a set of CAR files. The last block written to the stream is assumed to be the DAG root and becomes the CAR root CID for the last CAR output.

More information: [`CARFile`](#carfile)

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
): Promise<UploadAddResponse>
```

Register a set of stored CAR files as an "upload" in the system. A DAG can be split between multipe CAR files. Calling this function allows multiple stored CAR files to be considered as a single upload.

Required delegated capability proofs: `upload/add`

More information: [`InvocationConfig`](#invocationconfig)

### `Upload.list`

```ts
function list(
  conf: InvocationConfig,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<UploadListResult>>
```

List uploads created by the issuer.

Required delegated capability proofs: `upload/list`

More information: [`InvocationConfig`](#invocationconfig)

### `Upload.remove`

```ts
function remove(
  conf: InvocationConfig,
  link: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a upload by root data CID.

Required delegated capability proofs: `upload/remove`

More information: [`InvocationConfig`](#invocationconfig)

## Types

### `CARFile`

A `Blob` with two extra properties:

```ts
type CARFile = Blob & { version: 1; roots: CID[] }
```

### `CARMetadata`

Metadata pertaining to a CAR file.

```ts
export interface CARMetadata {
  /**
   * CAR version number.
   */
  version: number
  /**
   * Root CIDs present in the CAR header.
   */
  roots: CID[]
  /**
   * CID of the CAR file (not the data it contains).
   */
  cid: CID
  /**
   * Piece CID of the CAR file.
   */
  piece: CID
  /**
   * Size of the CAR file in bytes.
   */
  size: number
}
```

### `DirectoryEntryLinkCallback`

Callback for every DAG encoded directory entry, including the root. It includes the CID, name (full path) and DAG size in bytes.

```ts
type DirectoryEntryLinkCallback = (link: DirectoryEntryLink) => void
```

### `InvocationConfig`

This is the configuration for the UCAN invocation. It's values can be obtained from an `Agent`. See [Create an Agent](#create-an-agent) for an example. It is an object with `issuer` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s). It is typically the user _agent_.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action.

### `InvocationConfigurator`

A function that generates [invocation configuration](#invocationconfig) for the requested capabilities. The intention is for the client to be able to [request, on demand, delegated capabilities from an application server](https://github.com/storacha/w3up-examples/tree/main/delegated-upload).

```ts
interface InvocationConfigurator {
  (caps: CapabilityQuery[]): Await<InvocationConfig>
}

interface CapabilityQuery {
  can: ServiceAbility
  nb?: unknown
}

// "space/blob/add", "space/index/add" etc.
type ServiceAbility = string
```

The function may be called multiple times with different requested capabilities.

Example:

```js
import { Agent } from '@web3-storage/access'
import * as Space from '@web3-storage/access/space'

const agent = await Agent.create()
const space = await Space.generate({ name: 'myspace' })

const configure = async (caps) => ({
  issuer: agent.issuer,
  with: space.did(),
  proofs: [
    // delegate from the space to the agent the requested capabilities
    await Delegation.delegate({
      issuer: space.signer,
      audience: agent.did(),
      capabilities: caps.map(c => ({ can: c.can, with: space.did(), nb: c.nb })),
      expiration: Math.floor(Date.now() / 1000) + (60 * 60) // 1h in seconds
    })
  ]
})

await uploadFile(configure, new Blob(['Hello World!']))
```

### `ShardStoredCallback`

A function called after a DAG shard has been successfully stored by the service:

```ts
type ShardStoredCallback = (meta: CARMetadata) => void
```

More information: [`CARMetadata`](#carmetadata)

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/storacha/w3up/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/storacha/w3up/blob/main/license.md)
