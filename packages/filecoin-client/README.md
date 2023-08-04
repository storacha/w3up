<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The w3filecoin client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/filecoin-client` package provides the "low level" client API to make data uploaded with the w3up platform available in Filecoin Storage providers. It is based on [web3-storage/specs/w3-filecoin.md])https://github.com/web3-storage/specs/blob/feat/filecoin-spec/w3-filecoin.md) and is not intended for web3.storage end users.

## Install

Install the package using npm:

```bash
npm install @web3-storage/filecoin-client
```

## Usage

### `Storefront.filecoinAdd`

Request a Storefront service to add computed filecoin piece into Filecoin Storage Providers.

```js
import { Storefront } from '@web3-storage/filecoin-client'

const add = await Storefront.filecoinAdd(
  invocationConfig,
  piece,
  content
)
```

```typescript
function filecoinAdd(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  content: Link, // Content CID
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Aggregator.pieceAdd`

Request an Aggregator service to add a filecoin piece into an aggregate to be offered to Filecoin Storage Providers.

```js
import { Aggregator } from '@web3-storage/filecoin-client'

const add = await Aggregator.pieceAdd(
  invocationConfig,
  piece,
  storefront,
  group
)
```

```typescript
function pieceAdd(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  storefront: string, // Storefront identifier
  group: string, // Aggregate grouping with different criterium
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Broker.aggregateAdd`

Request a Broker service to offer a filecoin piece (larger aggregate of pieces) to Filecoin Storage Providers.

```js
import { Broker } from '@web3-storage/filecoin-client'

const add = await Broker.aggregateAdd(
  invocationConfig,
  piece,
  offer,
  deal
)
```

```typescript
function pieceAdd(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece representing aggregate
  offer: Piece[], // Filecoin pieces part of the aggregate (sorted)
  deal: DealConfig, // Aggregate grouping with different criterium
): Promise<Receipt>

interface DealConfig {
  tenantId: string // Identifier of the tenant (storefront) for Broker
  label?: string // optionaal label for deal
}
```

More information: [`InvocationConfig`](#invocationconfig)

### `Chain.chainInfo`

Request a Chain service to find chain information of a given piece. It will return deals where given piece is present in Receipt.

```js
import { Chain } from '@web3-storage/filecoin-client'

const add = await Broker.chainInfo(
  invocationConfig,
  piece
)
```

```typescript
function chainInfo(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece to check
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

## Types

### `InvocationConfig`

This is the configuration for the UCAN invocation. It is an object with `issuer`, `audience`, `resource` and `proofs`:

- The `issuer` is the signing authority that is issuing the UCAN invocation(s).
- The `audience` is the principal authority that the UCAN is delegated to.
- The `resource` (`with` field) points to a storage space.
- The `proofs` are a set of capability delegations that prove the issuer has the capability to perform the action. These might not be required.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)