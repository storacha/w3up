<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/access` package provides an API for creating and managing "Agents," which are software entities that control private signing keys and can invoke capabilities on behalf of a user (or another Agent).

Agents are used to invoke capabilities provided by the w3up service layer, using the [ucanto](https://github.com/web3-storage/ucanto) RPC framework. Agents are created locally on an end-user's device, and users are encouraged to create new Agents for each device (or browser) that they want to use, rather than sharing Agent keys between devices.

An Agent can create "Spaces," which are namespaces for content stored on the w3up platform. Each Space has its own keypair, the public half of which is used to form a `did:key:` URI that uniquely identifies the Space. The Space's private key is used to delegate capabilities to a primary Agent, which then issues ucanto requests related to the Space.

Although Agents (and Spaces) are created locally by generating keypairs, the w3up services will only act upon Spaces that have been registered with the w3up access service. By default, a newly-created Agent will be configured to use the production access service for remote operations, including registration.

## Install

Install the package:

```bash
npm install @web3-storage/access
``` 

## Usage

[API Reference](https://web3-storage.github.io/w3protocol/modules/_web3_storage_access.html)

### Agent creation

To create an Agent, you must first create a `Store`, which the Agent will use to store and manage persistent state, including private keys.

If you're running in a web browser, use [`StoreIndexedDB`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.StoreIndexedDB.html), which uses IndexedDB to store non-extractable [`CryptoKey`](https://www.w3.org/TR/WebCryptoAPI/#dfn-CryptoKey) objects. This prevents the private key material from ever being exposed to the JavaScript environment.

```js
import { Agent } from '@web3-storage/access/agent'
import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'

const store = await StoreIndexedDB.open('my-db-name')
const agent = await Agent.create( { store })
```

On node.js, use [`StoreConf`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.StoreConf.html), which uses the [`conf` package](https://www.npmjs.com/package/conf) to store keys and metadata in the user's platform-specific default configuration location (usually in their home directory).

```js
import { Agent } from '@web3-storage/access/agent'
import { StoreConf } from '@web3-storage/access/stores/store-conf'

const store = new StoreConf({ profile: 'app' })
if (!(await store.exists())) {
  await store.init({})
}

const agent = await Agent.create({ store })
```

See the [`AgentCreateOptions` reference](https://web3-storage.github.io/w3protocol/interfaces/_web3_storage_access._internal_.AgentCreateOptions.html) if you want to configure the Agent to use a non-production service connection.

### Space creation

A newly-created Agent does not have access to any Spaces, and is thus unable to store data using the w3up platform.

To create a new Space, use [`agent.createSpace`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#createSpace), optionally passing in a human-readable name.

This will create a new signing keypair for the Space and use it to issue a non-expiring delegation for all Space-related capabilities to the Agent, which will persist the delegation in its Store for future use.

The `createSpace` method returns an object describing the space:

```ts
interface CreateSpaceResult {
  /** The Space's Decentralized Identity Document (DID) */
  did: string,

  /** 
   * Metadata for the Space, including optional friendly `name` and an `isRegistered` flag.
   * Persisted locally in the Agent's Store.
   */
  meta: Record<string, unknown>,

  /**
   * Cryptographic proof of the delegation from Space to Agent.
   * Persisted locally in the Agent's Store.
   */
  proof: Ucanto.Delegation
}
```

### Managing the current space

An Agent can create multiple Spaces and may also be issued delegations that allow it to manage Spaces created by other Agents. The Agent's `spaces` property is a `Map` keyed by Space DID, whose values are the metadata associated with each Space.

Agents may also have a "current" space, which is used as the default Space for storage operations if none is specified. You can retrieve the DID of the current space with [`agent.currentSpace`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#currentSpace). If you also want the metadata and proofs associated with the space, use [`agent.currentSpaceWithMeta`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#currentSpaceWithMeta). 

To set the current space, use [`agent.setCurrentSpace`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#setCurrentSpace). Note that this must be done explicitly; creating an Agent's first Space does not automatically set it as the current space.

### Space registration

A newly-created Space must be registered with the w3up access service before it can be used as a storage location.

To register a space, use [`agent.registerSpace`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#registerSpace), which takes an email address parameter and registers the [current space](#managing-the-current-space) with the access service.

Calling `registerSpace` will cause the access service to send a confirmation email to the provided email address. When the activation link in the email is clicked, the service will send the Agent a delegation via a WebSocket connection that grants access to the services included in w3up's free tier. The `registerSpace` method returns a `Promise` that resolves once the registration process is complete. Make sure to wrap calls to `registerSpace` in a `try/catch` block, as registration will fail if the user does not confirm the email (or if network issues arise, etc.).

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)
