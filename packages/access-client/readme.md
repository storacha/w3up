<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/access` package provides an API for creating and managing "Agents," which are software entities that control private signing keys and can invoke capabilities on behalf of a user (or another Agent).

Agents are used to invoke capabilities provided by the w3up service layer, using the [ucanto](https://github.com/web3-storage/ucanto) RPC framework. Agents are created locally on an end-user's device, and users are encouraged to create new Agents for each device (or browser) that they want to use, rather than sharing Agent keys between devices.

An Agent can create "Spaces," which are namespaces for content stored on the w3up platform. Each Space has its own keypair, the public half of which is used to form a `did:key:` URI that uniquely identifies the Space. The Space's private key is used to delegate capabilities to a primary Agent, which then issues ucanto requests related to the Space.

Although Agents (and Spaces) are created locally by generating keypairs, the w3up services will only act upon Spaces that have been registered with the w3up access service. By default, a newly-created Agent will be configured to use the production access service for remote operations, including registration.

Please note that the `@web3-storage/access` package is a fairly "low level" component of the w3up JavaScript stack, and most users will be better served by [`@web3-storage/w3up-client`](https://github.com/web3-storage/w3up-client), which combines this package with a client for the upload and storage service and presents a simpler API.

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

Agents in a browser use RSA keys, which can be generated using the async `generate` function from `@ucanto/principal/rsa`.

```js
import { Agent } from '@web3-storage/access/agent'
import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'
import { generate } from '@ucanto/principal/rsa'

async function createAgent(agentName = 'default-agent') {
  const store = await StoreIndexedDB.open('my-db-name')

  // if agent data already exists in the store, use it to create an Agent.
  const data = await store.load()
  if (data) {
    return Agent.from(data, { store })
  }

  // otherwise, generate a new RSA signing key to act as the Agent's principal
  // and create a new Agent, passing in the store so the Agent can persist its state
  const principal = await generate()
  const agentData = {
    meta: { name: agentName },
    principal
  }
  return Agent.create(agentData, { store })
}
```

On node.js, use [`StoreConf`](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.StoreConf.html), which uses the [`conf` package](https://www.npmjs.com/package/conf) to store keys and metadata in the user's platform-specific default configuration location (usually in their home directory).

Agents on node should use Ed25519 keys,

```js
import { Agent } from '@web3-storage/access/agent'
import { StoreConf } from '@web3-storage/access/stores/store-conf'
import { generate } from '@ucanto/principal/ed25519'

async function createAgent(agentName = 'default-agent') {
  const store = new StoreConf({ profile: 'my-w3up-app' })
  if (!(await store.exists())) {
    await store.init({})
  }

  // if agent data already exists in the store, use it to create an Agent.
  const data = await store.load()
  if (data) {
    return Agent.from(data, { store })
  }

  // otherwise, generate a new Ed25519 signing key to act as the Agent's principal
  // and create a new Agent, passing in the store so the Agent can persist its state
  const principal = await generate()
  const agentData = {
    meta: { name: agentName },
    principal
  }
  return Agent.create(agentData, { store })
}

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

### Delegating to another Agent

The Agent's [`delegate` method](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#delegate) allows you to delegate capabilities to another Agent.

```js
const delegation = await agent.delegate({
  audience: 'did:key:kAgentToDelegateTo',
  abilities: [
    {
      can: 'space/info',
      with: agent.currentSpace()
    }
  ]
})
```

Note that the receiving agent will need to [import the delegation](#importing-delegations-from-another-agent) before they will be able to invoke the delegated capabilities.

### Importing delegations from another Agent

The [`addProof` method](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#addProof) takes in a ucanto `Delegation` and adds it to the Agent's state Store. The proof of delegation can be retrieved using the Agent's [`proofs` method](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#proofs).


The [`importSpaceFromDelegation` method](https://web3-storage.github.io/w3protocol/classes/_web3_storage_access.Agent.html#importSpaceFromDelegation) also accepts a ucanto `Delegation`, but it is tailored for "full delegation" of all Space-related capabilities. The delegated ability must be `space/*`, which is the "top" of the `space/` ability set. Use `importSpaceFromDelegation` in preference to `addProofs` when importing a full `space/*` delegation, as it also adds metadata about the imported Space to the Agent's `spaces` Map and persistent Store.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)
