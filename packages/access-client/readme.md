<h1 align="center">🐔<br/>storacha.network</h1>
<p align="center">The access client for <a href="https://storacha.network">https://storacha.network</a></p>

## About

The `@storacha/access` package provides an API for creating and managing "agents," which are software entities that control private signing keys and can invoke capabilities on behalf of a user (or another agent).

Agents are used to invoke capabilities provided by the w3up service layer, using the [ucanto](https://github.com/storacha/ucanto) RPC framework. Agents are created locally on an end-user's device, and users are encouraged to create new agents for each device (or browser) that they want to use, rather than sharing agent keys between devices.

An Agent can create "spaces," which are namespaces for content stored on the w3up platform. Each space has its own keypair, the public half of which is used to form a `did:key:` URI that uniquely identifies the space. The space's private key is used to delegate capabilities to a primary agent, which then issues ucanto requests related to the space.

Although agents (and spaces) are created locally by generating keypairs, the w3up services will only act upon spaces that have been registered with the w3up access service. By default, a newly-created agent will be configured to use the production access service for remote operations, including registration.

Please note that the `@storacha/access` package is a fairly "low level" component of the w3up JavaScript stack, and most users will be better served by [`@storacha/client`](https://github.com/storacha/upload-service/tree/main/packages/w3up-client), which combines this package with a client for the upload and storage service and presents a simpler API.

## Install

Install the package:

```bash
npm install @storacha/access
```

## Usage

[API Reference](https://web3-storage.github.io/w3up/modules/_web3_storage_access.html)

### Agent creation

To create an agent, you must first create a `Store`, which the agent will use to store and manage persistent state, including private keys.

If you're running in a web browser, use [`StoreIndexedDB`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.StoreIndexedDB.html), which uses IndexedDB to store non-extractable [`CryptoKey`](https://www.w3.org/TR/WebCryptoAPI/#dfn-CryptoKey) objects. This prevents the private key material from ever being exposed to the JavaScript environment.

Agents in a browser use RSA keys, which can be generated using the async `generate` function from `@ucanto/principal/rsa`.

```js
import { Agent } from '@storacha/access/agent'
import { StoreIndexedDB } from '@storacha/access/stores/store-indexeddb'
import { generate } from '@ucanto/principal/rsa'

async function createAgent() {
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
    meta: { name: 'my-browser-agent' },
    principal,
  }
  return Agent.create(agentData, { store })
}
```

On node.js, use [`StoreConf`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.StoreConf.html), which uses the [`conf` package](https://www.npmjs.com/package/conf) to store keys and metadata in the user's platform-specific default configuration location (usually in their home directory).

Agents on node should use Ed25519 keys:

```js
import { Agent } from '@storacha/access/agent'
import { StoreConf } from '@storacha/access/stores/store-conf'
import { generate } from '@ucanto/principal/ed25519'

async function createAgent() {
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
    meta: { name: 'my-nodejs-agent' },
    principal,
  }
  return Agent.create(agentData, { store })
}
```

See the [`AgentCreateOptions` reference](https://web3-storage.github.io/w3up/interfaces/_web3_storage_access._internal_.AgentCreateOptions.html) if you want to configure the agent to use a non-production service connection.

### Space creation

A newly-created agent does not have access to any spaces, and is thus unable to store data using the w3up platform.

To create a new space, use [`agent.createSpace`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#createSpace), optionally passing in a human-readable name.

This will create a new signing keypair for the space and use it to issue a non-expiring delegation for all space-related capabilities to the agent, which will persist the delegation in its Store for future use.

The `createSpace` method returns an object describing the space:

```ts
interface CreateSpaceResult {
  /** The Space's Decentralized Identity Document (DID) */
  did: string

  /**
   * Metadata for the Space, including optional friendly `name` and an `isRegistered` flag.
   * Persisted locally in the Agent's Store.
   */
  meta: Record<string, unknown>

  /**
   * Cryptographic proof of the delegation from Space to Agent.
   * Persisted locally in the Agent's Store.
   */
  proof: Ucanto.Delegation
}
```

### Managing the current space

An agent can create multiple spaces and may also be issued delegations that allow it to manage spaces created by other agents. The agent's `spaces` property is a `Map` keyed by space DID, whose values are the metadata associated with each space.

Agents may also have a "current" space, which is used as the default space for storage operations if none is specified. You can retrieve the DID of the current space with [`agent.currentSpace`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#currentSpace). If you also want the metadata and proofs associated with the space, use [`agent.currentSpaceWithMeta`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#currentSpaceWithMeta).

To set the current space, use [`agent.setCurrentSpace`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#setCurrentSpace). Note that this must be done explicitly; creating an agent's first space does not automatically set it as the current space.

### Space registration

A newly-created space must be registered with the w3up access service before it can be used as a storage location.

To register a space, use [`agent.registerSpace`](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#registerSpace), which takes an email address parameter and registers the [current space](#managing-the-current-space) with the access service.

Calling `registerSpace` will cause the access service to send a confirmation email to the provided email address. When the activation link in the email is clicked, the service will send the agent a delegation via a WebSocket connection that grants access to the services included in w3up's free tier. The `registerSpace` method returns a `Promise` that resolves once the registration process is complete. Make sure to wrap calls to `registerSpace` in a `try/catch` block, as registration will fail if the user does not confirm the email (or if network issues arise, etc.).

### Delegating to another agent

The agent's [`delegate` method](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#delegate) allows you to delegate capabilities to another agent.

```js
const delegation = await agent.delegate({
  audience: 'did:key:kAgentToDelegateTo',
  abilities: [
    {
      can: 'space/info',
      with: agent.currentSpace(),
    },
  ],
})
```

Note that the receiving agent will need to [import the delegation](#importing-delegations-from-another-agent) before they will be able to invoke the delegated capabilities.

### Importing delegations from another agent

The [`addProof` method](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#addProof) takes in a ucanto `Delegation` and adds it to the agent's state Store. The proof of delegation can be retrieved using the agent's [`proofs` method](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#proofs).

The [`importSpaceFromDelegation` method](https://web3-storage.github.io/w3up/classes/_web3_storage_access.Agent.html#importSpaceFromDelegation) also accepts a ucanto `Delegation`, but it is tailored for "full delegation" of all space-related capabilities. The delegated ability must be `*`, which is the "top" ability that can derive all abilities for the Space's DID. Use `importSpaceFromDelegation` in preference to `addProofs` when importing a full `*` delegation for a space, as it also adds metadata about the imported space to the Agent's persistent store and adds the space to the agent's set of authorized spaces.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/storacha/upload-service/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/storacha/upload-service/blob/main/license.md)
