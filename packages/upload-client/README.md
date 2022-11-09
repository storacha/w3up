<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The JavaScript API client for <a href="https://web3.storage">https://web3.storage</a></p>

## Install

Install the package using npm:

```console
npm install @web3-storage/upload-client
```

## Usage

### Uploading files

```js
import { uploadFile } from '@web3-storage/upload-client'

const cid = await uploadFile(account, signer, new Blob(['Hello World!']))
```

```js
import { uploadDirectory } from '@web3-storage/upload-client'

const cid = await uploadDirectory(account, signer, [
  new File(['doc0'], 'doc0.txt'),
  new File(['doc1'], 'dir/doc1.txt')
])

// Note: you can use https://npm.im/files-from-path to read files from the
// filesystem in Nodejs.
```

### Bring your own DAG

#### Buffering API

```js
import { encodeFile, encodeCAR, storeDAG, registerUpload } from '@web3-storage/upload-client'

// Encode a file as a DAG, get back a root data CID and a set of blocks
const { cid, blocks } = await encodeFile(file)
// Encode the DAG as a CAR file
const car = await encodeCAR(blocks, cid)
// Store the CAR file to the service
const carCID = await storeDAG(account, signer, car)
// Register an "upload" - a root CID contained within the passed CAR file(s)
await registerUpload(account, signer, cid, [carCID])
```

#### Streaming API

```js
import { createFileEncoderStream, ShardingStream, ShardStoringStream, registerUpload } from '@web3-storage/upload-client'

const cars = []
// Encode a file as a DAG, get back a readable stream of blocks.
await createFileEncoderStream(file)
  // Pipe blocks to a stream that yields CARs files - shards of the DAG.
  .pipeThrough(new ShardingStream())
  // Pipe CARs to a stream that stores them to the service and yields metadata
  // about the CARs that were stored.
  .pipeThrough(new ShardStoringStream(account, issuer))
  // Collect the metadata, we're mostly interested in the CID of each CAR file
  // and the root data CID (which can be found in the _last_ CAR file).
  .pipeTo(new WritableStream({ write: car => { cars.push(car) } }))

// The last CAR stored contains the root data CID
const rootCID = cars[cars.length - 1].roots[0]
const carCIDs = cars.map(car => car.cid)

// Register an "upload" - a root CID contained within the passed CAR file(s)
await registerUpload(account, signer, rootCID, carCIDs)
```

## API

* [`createDirectoryEncoderStream`](#createdirectoryencoderstream)
* [`createFileEncoderStream`](#createfileencoderstream)
* [`encodeCAR`](#encodecar)
* [`encodeDirectory`](#encodedirectory)
* [`encodeFile`](#encodefile)
* [`registerUpload`](#registerupload)
* [`storeDAG`](#storedag)
* [`ShardingStream`](#shardingstream)
* [`ShardStoringStream`](#shardstoringstream)
* [`uploadDirectory`](#uploaddirectory)
* [`uploadFile`](#uploadfile)

---

### `encodeCAR`

```ts
encodeCAR (blocks: Iterable<Block>, root?: CID): Promise<Blob & { version: 1, roots: CID[] }>
```

Encode a DAG as a CAR file.

Example:

```js
const { cid, blocks } = await encodeFile(new File(['data'], 'doc.txt'))
const car = await encodeCAR(blocks, cid)
```

### `encodeDirectory`

```ts
encodeDirectory (files: Iterable<File>): Promise<{ cid: CID, blocks: Block[] }>
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
encodeFile (file: Blob): Promise<{ cid: CID, blocks: Block[] }>
```

Create a UnixFS DAG from the passed file data.

Example:

```js
const { cid, blocks } = await encodeFile(new File(['data'], 'doc.txt'))
// Note: file name is not preserved - use encodeDirectory if required.
```

### `registerUpload`

```ts
registerUpload (account: DID, signer: Signer, root: CID, shards: CID[], options: { retries?: number, signal?: AbortSignal } = {}): Promise<void>
```

Register a set of stored CAR files as an "upload" in the system. A DAG can be split between multipe CAR files. Calling this function allows multiple stored CAR files to be considered as a single upload.

### `storeDAG`

```ts
storeDAG (account: DID, signer: Signer, car: Blob, options: { retries?: number, signal?: AbortSignal } = {}): Promise<CID>
```

Store a CAR file to the service.
