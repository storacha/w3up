# `@w3ui/keyring-core`

## Install

```sh
npm install @w3ui/keyring-core
```
## Usage

```js
import * as KeyringCore from '@w3ui/keyring-core'
```

## Exports

**Interfaces**

- [`KeyringContextState`](#keyringcontextstate)
- [`KeyringContextActions`](#keyringcontextactions)

**Classes**

- [`Space`](#space)
  - [`name`](#name)
  - [`did`](#did)
  - [`registered`](#registered)
  - [`meta`](#meta)

**Functions**

- [`createAgent`](#createagent)
- [`getCurrentSpace`](#getcurrentspace)
- [`getSpaces`](#getspaces)

---

### `KeyringContextState`

Interface for keyring state. Implementations are framework-specific and found in each framework's `-keyring` module (e.g. `@w3ui/react-keyring`).

```ts
export interface KeyringContextState {
  /**
   * The current space.
   */
  space?: Space
  /**
   * Spaces available to this agent.
   */
  spaces: Space[]
  /**
   * The current user agent (this device).
   */
  agent?: Signer
}
```

### `KeyringContextActions`

Interface for keyring actions. Implementations are framework-specific and found in each framework's `-keyring` module (e.g. `@w3ui/react-keyring`).

```ts
export interface KeyringContextActions {
  /**
   * Load the user agent and all stored data from secure storage.
   */
  loadAgent: () => Promise<void>
  /**
   * Unload the user agent and all stored data from secure storage. Note: this
   * does not remove data, use `resetAgent` if that is desired.
   */
  unloadAgent: () => Promise<void>
  /**
   * Unload the current space and agent from memory and remove from secure
   * storage. Note: this removes all data and is unrecoverable.
   */
  resetAgent: () => Promise<void>
  /**
   * Create a new space with the passed name and set it as the current space.
   */
  createSpace: (name?: string) => Promise<DID>
  /**
   * Use a specific space.
   */
  setCurrentSpace: (did: DID) => Promise<void>
  /**
   * Register the current space and store in secure storage. Automatically
   * sets the newly registered space as the current space.
   */
  registerSpace: (email: string) => Promise<void>
  /**
   * Abort an ongoing account registration.
   */
  cancelAuthorize: () => void,
  /**
   * Get all the proofs matching the capabilities. Proofs are delegations with
   * an audience matching the agent DID.
   */
  getProofs: (caps: Capability[]) => Promise<Proof[]>
}
```

### `Space`

A subclass of ucanto's `Principal` type that represents a storage location uniquely identified by its DID.

A `Space` has the following methods:

#### `name`

```ts
name(): String
```

Returns the "friendly" name for the space, or the space DID if no name is set.

#### `did`

```ts
did(): DID
```

Returns the DID string for the space.

#### `registered`

```ts
registered(): Boolean
```

Returns `true` if the space has been registered with the service.

#### `meta`

```ts
meta(): Record<string, any>
```

Returns user-defined metadata attached to the space.

### `createAgent`

```ts
createAgent (options: CreateAgentOptions = {}): Promise<Agent> 
```

Create the user agent and load account information from secure storage.

`CreateAgentOptions` accepts the following fields:

| field              | type                    | description                                          |
| ------------------ | ----------------------- | ---------------------------------------------------- |
| `servicePrincipal` | ucanto `Principal`      | contains the DID & public key for the access service |
| `connection`       | ucanto `ConnectionView` | a connection to the access service                   |

If `servicePrincipal` or `connection` are not provided, defaults to the production service.

### `getCurrentSpace`

```ts
getCurrentSpace(agent: Agent): Space | undefined
```

Returns the given `agent`'s current space, or `undefined` if the agent has no current space set.

### `getSpaces`

```ts
getSpaces(agent: Agent): Space[]
```

Returns an array of all spaces that the agent has access to.
