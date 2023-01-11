<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The main JavaScript client for the w3up platform by <a href="https://web3.storage">https://web3.storage</a></p>
<p align="center">
  <a href="https://github.com/web3-storage/w3up-client/actions/workflows/test.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/w3up-client/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://discord.com/channels/806902334369824788/864892166470893588"><img src="https://img.shields.io/badge/chat-discord?style=for-the-badge&logo=discord&label=discord&logoColor=ffffff&color=7389D8" /></a>
  <a href="https://twitter.com/web3storage"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/web3storage?color=00aced&label=twitter&logo=twitter&style=for-the-badge"></a>
  <a href="https://github.com/web3-storage/w3up-client/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

> ### ⚠️❗ w3up-client and the underlying APIs are currently beta preview features
> Please read the beta [Terms of Service](https://purrfect-tracker-45c.notion.site/w3up-beta-Terms-of-Service-39cb5c13439849beae327a2efec9164a) for more details.
>
> Open an issue on the repo or reach out to the #web3-storage channel on [IPFS Discord](https://docs.ipfs.tech/community/chat/#discord) if you have any 
questions!

## About

`@web3-storage/w3up-client` is a JavaScript libary that provides a convenient interface to the w3up platform, a simple "on-ramp" to the content-addressed decentralized IPFS network.

This library is the user-facing "porcelain" client for interacting with w3up services from JavaScript. It wraps the lower-level [`@web3-storage/access`][access-client-github] and [`@web3-storage/upload-client`][upload-client-github] client packages, which target individual w3up services. We recommend using `w3up-client` instead of using those "plumbing" packages directly, but you may find them useful if you need more context on w3up's architecture and internals.

- [Install](#install)
- [Usage](#usage)
  - [Core concepts](#core-concepts)
  - [Basic usage](#basic-usage)
    - [Creating a client object](#creating-a-client-object)
    - [Creating and registering Spaces](#creating-and-registering-spaces)
    - [Uploading data](#uploading-data)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Install

You can add the `@web3-storage/w3up-client` package to your JavaScript or TypeScript project with `npm`:

```sh
npm install @web3-storage/w3up-client
```

## Usage

[API Reference](#api)

### Core concepts

w3up services use [ucanto][ucanto], a Remote Proceedure Call (RPC) framework built around [UCAN](https://ucan.xzy), or User Controlled Authorization Networks. UCANs are a powerful capability-based authorization system that allows fine-grained sharing of permissions through a process called _delegation_. See our [intro to UCAN blog post](https://blog.web3.storage/posts/intro-to-ucan) for an overview of UCAN.

`w3up-client` and `ucanto` take care of the details of UCANs for you, but a few of the underlying terms and concepts may "bubble up" to the surface of the API, so we'll cover the basics here. We'll also go over some terms that are specific to w3up that you might not have encountered elsewhere.

UCAN-based APIs are centered around _capabilities_, which are comprised of an _ability_ and a _resource_. Together, the ability and resource determine what action a client can perform and what objects in the system can be acted upon. When invoking a service method, a client will present a UCAN token that includes an ability and resource, along with _proofs_ that verify that they should be allowed to exercise the capability.

To invoke a capability, the client must have a private signing key, which is managed by a component called an _Agent_. When you [create a client object](#creating-a-client-object) with `w3up-client`, an Agent is automatically created for you and used when making requests. The Agent's keys and metadata are securely stored and are loaded the next time you create a client. 

Each device or browser should create its own Agent, so that private keys are never shared across multiple devices. Instead of sharing keys, a user can delegate some or all of their capabilites from one Agent to another.

When you upload data to w3up, your uploads are linked to a unique _Space_ acts as a "namespace" for the data you upload. Spaces are used to keep track of which uploads belong to which users, among other things.

When invoking storage capabilities, the Space ID is the "resource" portion of the capability, while the ability is an action like `store/add` or `store/remove`.

Both Agents and Spaces are identified using _DIDs_, or Decentralized Identity Documents. DIDs are a [W3C specification](https://www.w3.org/TR/did-core/) for verifiable identities in decentralized systems. There are several DID "methods," but the ones most commonly used by w3up are [`did:key`](https://w3c-ccg.github.io/did-method-key/), which includes a public key directly in the DID string. Agents and Spaces both use `did:key` URI strings as their primary identifiers. The other DID method used by w3up is [`did:web`](https://w3c-ccg.github.io/did-method-web/), which is used to identify the service providers.

Agents and Spaces are both generated by `w3up-client` on the user's local machine. Before they can be used for storage, the user will need to [register the space](#creating-and-registering-spaces) by confirming their email address. Once registered, a Space can be used to [upload files and directories](#uploading-data).

### Basic usage

This section shows some of the basic operations available in the `w3up-client` package. See the [API reference docs][docs] or the source code of the [`w3up-cli` package][w3up-cli-github], which uses `w3up-client` throughout.

#### Creating a client object

The package provides a [static `create` function][docs-create] that returns a [`Client` object][docs-Client]. 

```js
import { create } from '@web3-storage/w3up-client'

const client = await create()
```

By default, clients will be configured to use the production w3up service endpoints, and the client will create a new [`Agent`][access-docs-Agent] with a persistent `Store` if it can't find one locally to load.

Agents are entities that control the private signing keys used to interact with the w3up service layer. You can access the client's `Agent` with the [`agent()` accessor method][docs-Client#agent]. 

`create` accepts an optional [`ClientFactoryOptions` object][docs-ClientFactoryOptions], which can be used to target a non-production instance of the w3up access and upload services, or to use a non-default persistent `Store`. See the [`@web3-storage/access` docs](https://web3-storage.github.io/w3protocol/modules/_web3_storage_access.html) for more about `Store` configuration.

#### Creating and registering Spaces

Before you can upload data, you'll need to create a [`Space`][docs-Space] and register it with the service.

A Space acts as a namespace for your uploads. Spaces are created using the [`createSpace` client method][docs-client#createSpace]:

```js
const space = await client.createSpace('my-awesome-space')
```

The name parameter is optional. If provided, it will be stored in your client's local state store and can be used to provide a friendly name for user interfaces.

After creating a `Space`, you'll need to register it with the w3up service before you can upload data.

First, set the space as your "current" space using the [`setCurrentSpace` method][docs-Client#setCurrentSpace], passing in the DID of the `space` object you created above:

```js
await client.setCurrentSpace(space.did())
```

Next, call the [`registerSpace` method][docs-Client#registerSpace], passing in an email address to register as the primary contact for the space:

```js
try {
  await client.registerSpace('zaphod@beeblebrox.galaxy')
} catch (err) {
  console.error('registration failed: ', err)
}
```

Calling `registerSpace` will cause an email to be sent to the given address. Once a user clicks the confirmation link in the email, the `registerSpace` method will resolve. Make sure to check for errors, as `registerSpace` will fail if the email is not confirmed within the expiration timeout.

Registering a space enrolls it in web3.storage's free usage tier, allowing you to store files, list uploads, etc.

#### Uploading data

Once you've [created and registered a space](#creating-and-registering-spaces), you can upload files to the w3up platform.

Call [`uploadFile`][docs-Client#uploadFile] to upload a single file, or [`uploadDirectory`][docs-Client#uploadDirectory] to upload multiple files.

`uploadFile` expects a "Blob like" input, which can be a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) or [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) when running in a browser. On node.js, see the [`filesFromPath` library](https://github.com/web3-storage/files-from-path), which can load compatible objects from the local filesystem.

`uploadDirectory` requires `File`-like objects instead of `Blob`s, as the file's `name` property is used to build the directory hierarchy. 

You can control the directory layout and create nested directory structures by using `/` delimited paths in your filenames:

```js
const files = [
  new File(['some-file-content'], 'readme.md'),
  new File(['import foo'], 'src/main.py'),
  new File([someBinaryData], 'images/example.png'),
]

const directoryCid = await client.storeDirectory(files)
```

In the example above, `directoryCid` resolves to an IPFS directory with the following layout:

```
.
├── images
│   └── example.png
├── readme.md
└── src
    └── main.py
```

## API

- [`create`](#create)
- `Client`
  - [`uploadDirectory`](#uploaddirectory)
  - [`uploadFile`](#uploadfile)
  - [`uploadCAR`](#uploadcar)
  - [`agent`](#agent)
  - [`currentSpace`](#currentspace)
  - [`setCurrentSpace`](#setcurrentspace)
  - [`spaces`](#spaces)
  - [`createSpace`](#createspace)
  - [`registerSpace`](#registerSpace)
  - [`addSpace`](#addSpace)
  - [`proofs`](#proofs)
  - [`addProof`](#addproof)
  - [`delegations`](#delegations)
  - [`createDelegation`](#createdelegation)
  - [`capability.space.info`](#capabilityspaceinfo)
  - [`capability.space.recover`](#capabilityspacerecover)
  - [`capability.store.add`](#capabilitystoreadd)
  - [`capability.store.list`](#capabilitystorelist)
  - [`capability.store.remove`](#capabilitystoreremove)
  - [`capability.upload.add`](#capabilityuploadadd)
  - [`capability.upload.list`](#capabilityuploadlist)
  - [`capability.upload.remove`](#capabilityuploadremove)
- [Types](#types)
  - [`Capability`](#capability)
  - [`CARMetadata`](#carmetadata)
  - [`ClientFactoryOptions`](#clientfactoryoptions)
  - [`Delegation`](#delegation)
  - [`Driver`](#driver)
  - [`ListResponse`](#listresponse)
  - [`ServiceConf`](#serviceconf)
  - [`ShardStoredCallback`](#shardstoredcallback)
  - [`Space`](#space)
  - [`StoreListResult`](#storelistresult)
  - [`UploadListResult`](#uploadlistresult)

---

### `create`

```ts
function create (options?: ClientFactoryOptions): Promise<Client>
```

Create a new w3up client.

If no backing store is passed one will be created that is appropriate for the environment.

If the backing store is empty, a new signing key will be generated and persisted to the store. In the browser an unextractable RSA key will be generated by default. In other environments an Ed25519 key is generated.

If the backing store already has data stored, it will be loaded and used.

More information: [`ClientFactoryOptions`](#clientfactoryoptions)

### `uploadDirectory`

```ts
function uploadDirectory (
  files: File[],
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored?: ShardStoredCallback
    shardSize?: number
    concurrentRequests?: number
  } = {}
): Promise<CID>
```

Uploads a directory of files to the service and returns the root data CID for the generated DAG. All files are added to a container directory, with paths in file names preserved.

More information: [`ShardStoredCallback`](#shardstoredcallback)

### `uploadFile`

```ts
function uploadFile (
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

More information: [`ShardStoredCallback`](#shardstoredcallback)

### `uploadCAR`

```ts
function uploadCAR (
  car: Blob,
  options: {
    retries?: number
    signal?: AbortSignal
    onShardStored?: ShardStoredCallback
    shardSize?: number
    concurrentRequests?: number
    rootCID?: CID
  } = {}
): Promise<void>
```

Uploads a CAR file to the service. The difference between this function and [capability.store.add](#capabilitystoreadd) is that the CAR file is automatically sharded and an "upload" is registered (see [`capability.upload.add`](#capabilityuploadadd)), linking the individual shards. Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.

More information: [`ShardStoredCallback`](#shardstoredcallback)

### `agent`

```ts
function agent (): Signer
```

The user agent. The agent is a signer - an entity that can sign UCANs with keys from a `Principal` using a signing algorithm.

### `currentSpace`

```ts
function currentSpace (): Space|undefined
```

The current space in use by the agent.

### `setCurrentSpace`

```ts
function setCurrentSpace (did: DID): Promise<void>
```

Use a specific space.

### `spaces`

```ts
function spaces (): Space[]
```

Spaces available to this agent.

### `createSpace`

```ts
async function createSpace (name?: string): Promise<Space>
```

Create a new space with an optional name.

### `registerSpace`

```ts
async function registerSpace (
  email: string,
  options?: { signal?: AbortSignal }
): Promise<Space>
```

Register the _current_ space with the service.

Invokes `voucher/redeem` for the free tier, waits on the websocket for the `voucher/claim` and invokes it.

It also adds a full space delegation to the service in the `voucher/claim` invocation to allow for recovery.

### `addSpace`

```ts
async function addSpace (proof: Delegation): Promise<Space>
```

Add a space from a received proof. Proofs are delegations with an _audience_ matching the agent DID.

### `proofs`

```ts
function proofs (capabilities?: Capability[]): Delegation[]
```

Get all the proofs matching the capabilities. Proofs are delegations with an _audience_ matching the agent DID.

### `addProof`

```ts
function addProof (proof: Delegation): Promise<void>
```

Add a proof to the agent. Proofs are delegations with an _audience_ matching the agent DID. Note: you probably want to use `addSpace` unless you know the delegation you received targets a resource _other_ than a w3 space.

### `delegations`

```ts
function delegations (capabilities?: Capability[]): Delegation[]
```

Get delegations created by the agent for others. Filtered optionally by capability.

### `createDelegation`

```ts
function createDelegation (
  audience: Principal,
  abilities: string[],
  options?: UCANOptions
): Promise<Delegation>
```

Create a delegation to the passed audience for the given abilities with the _current_ space as the resource.

### `capability.store.add`

```ts
function add (
  car: Blob,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<CID>
```

Store a CAR file to the service.

### `capability.store.list`

```ts
function list (
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<StoreListResult>>
```

List CAR files stored in the current space.

More information: [`StoreListResult`](#storelistresult), [`ListResponse`](#listresponse)

### `capability.store.remove`

```ts
function remove (
  link: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a stored CAR file by CAR CID.

### `capability.upload.add`

```ts
function add (
  root: CID,
  shards: CID[],
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<UploadAddResponse>
```

Register a set of stored CAR files as an "upload" in the system. A DAG can be split between multipe CAR files. Calling this function allows multiple stored CAR files to be considered as a single upload.

### `capability.upload.list`

```ts
function list(
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<ListResponse<UploadListResult>>
```

List uploads created in the current space.

More information: [`UploadListResult`](#uploadlistresult), [`ListResponse`](#listresponse)

### `capability.upload.remove`

```ts
function remove(
  link: CID,
  options: { retries?: number; signal?: AbortSignal } = {}
): Promise<void>
```

Remove a upload by root data CID.

## Types

### `Capability`

An object describing a UCAN capability, which specifies what action the UCAN holder `can` perform `with` some resource.

Defined by the [`@ipld/dag-ucan` package](https://github.com/ipld/js-dag-ucan).

```ts
export interface Capability<
  Can extends Ability = Ability,
  With extends Resource = Resource,
  Caveats extends unknown = unknown
> {
  with: With
  can: Can
  nb?: Caveats
}


export type Ability = `${string}/${string}` | "*"

export type Resource = `${string}:${string}`
```

The `can` field contains a string ability identifier, e.g. `store/add` or `space/info`.

The `with` field contains a resource URI, often a `did:key` URI that identifies a Space.

The optional `nb` (_nota bene_) field contains "caveats" that add supplemental information to a UCAN invocation or delegation.

See [the capability spec](https://github.com/web3-storage/w3protocol/blob/main/spec/capabilities.md) for more information about capabilities and how they are defined in w3up services.

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
   * Size of the CAR file in bytes.
   */
  size: number
}
```

### `ClientFactoryOptions`

Options for constructing new `Client` instances.

```ts
interface ClientFactoryOptions {
  /**
   * A storage driver that persists exported agent data.
   */
  store?: Driver<AgentDataExport>
  /**
   * Service DID and URL configuration.
   */
  serviceConf?: ServiceConf
}
```

More information: [`Driver`](#driver), [`ServiceConf`](#serviceconf)

### `Delegation`

An in-memory view of a UCAN delegation, including proofs that can be used to invoke capabilities or delegate to other agents.

```ts
import { Delegation as CoreDelegation } from '@ucanto/core/delegation'
export interface Delegation extends CoreDelegation {
  /**
   * User defined delegation metadata.
   */
  meta(): Record<string, any>
} 
```

The `Delegation` type in `w3up-client` extends the `Delegation` type defined by [`ucanto`][ucanto]:

```ts
export interface Delegation<C extends Capabilities = Capabilities> {
  readonly root: UCANBlock<C>
  readonly blocks: Map<string, Block>

  readonly cid: UCANLink<C>
  readonly bytes: ByteView<UCAN.UCAN<C>>
  readonly data: UCAN.View<C>

  asCID: UCANLink<C>

  export(): IterableIterator<Block>

  issuer: UCAN.Principal
  audience: UCAN.Principal
  capabilities: C
  expiration?: UCAN.UTCUnixTimestamp
  notBefore?: UCAN.UTCUnixTimestamp

  nonce?: UCAN.Nonce

  facts: Fact[]
  proofs: Proof[]
  iterate(): IterableIterator<Delegation>
}
```

Delegations can be serialized by calling `export()` and piping the returned `Block` iterator into a `CarWriter` from the [`@ipld/car` package](https://www.npmjs.com/package/@ipld/car).

### `Driver`

Storage drivers can be obtained from [`@web3-storage/access/stores`](https://github.com/web3-storage/w3protocol/tree/main/packages/access-client/src/stores). They persist data created and managed by an agent.

### `ListResponse`

A paginated list of items.

```ts
interface ListResponse<R> {
  cursor?: string
  size: number
  results: R[]
}
```

### `ServiceConf`

Service DID and URL configuration.

### `ShardStoredCallback`

A function called after a DAG shard has been successfully stored by the service:

```ts
type ShardStoredCallback = (meta: CARMetadata) => void
```

More information: [`CARMetadata`](#carmetadata)

### `Space`

An object representing a storage location. Spaces must be [registered](#registerspace) with the service before they can be used for storage.

```ts
interface Space {
  
  /**
   * The given space name.
   */  
  name(): string
  
  /**
   * The DID of the space.
   */  
  did(): string
  
  /**
   * Whether the space has been registered with the service.
   */  
  registered(): boolean
  
  
  /**
   * User defined space metadata.
   */  
  meta(): Record<string, any>
}
```

### `StoreListResult`

```ts
interface StoreListResult {
  link: CID
  size: number
  origin?: CID
}
```

### `UploadListResult`

```ts
interface UploadListResult {
  root: CID
  shards?: CID[]
}
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3up-client/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3up-client/blob/main/license.md)


[w3up-cli-github]: https://github.com/web3-storage/w3up-cli
[access-client-github]: https://github.com/web3-storage/w3protocol/tree/main/packages/access-client
[upload-client-github]: https://github.com/web3-storage/w3protocol/tree/main/packages/upload-client
[elastic-ipfs]: https://github.com/elastic-ipfs/elastic-ipfs
[ucanto]: https://github.com/web3-storage/ucanto
[car-spec]: https://ipld.io/specs/transport/car/
[web3storage-docs-cars]: https://web3.storage/docs/how-tos/work-with-car-files/

[docs]: https://web3-storage.github.io/w3up-client
[docs-Client]: https://web3-storage.github.io/w3up-client/classes/client.Client.html
[docs-Client#agent]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#agent
[docs-Client#createSpace]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#createSpace
[docs-Client#setCurrentSpace]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#setCurrentSpace
[docs-Client#registerSpace]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#registerSpace
[docs-Client#uploadFile]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#uploadFile
[docs-Client#uploadDirectory]: https://web3-storage.github.io/w3up-client/classes/client.Client.html#uploadDirectory 
[docs-Space]: https://web3-storage.github.io/w3up-client/classes/space.Space.html

[docs-create]: #create
[docs-ClientFactoryOptions]: #clientfactoryoptions

[access-docs-Agent]: https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html
