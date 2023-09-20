<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The w3filecoin client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/filecoin-client` package provides the "low level" client API to make data uploaded with the w3up platform available in Filecoin Storage providers. It is based on [web3-storage/specs/w3-filecoin.md](https://github.com/web3-storage/specs/blob/feat/filecoin-spec/w3-filecoin.md) and is not intended for web3.storage end users.

## Install

Install the package using npm:

```bash
npm install @web3-storage/filecoin-client
```

## Usage

### `Storefront.filecoinOffer`

Request storing a content piece in Filecoin.

```js
import { Storefront } from '@web3-storage/filecoin-client'

const res = await Storefront.filecoinOffer(
  invocationConfig,
  content,
  piece
)
```

```typescript
function filecoinOffer(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece, // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Storefront.filecoinSubmit`

Signal that an offered piece has been submitted to the filecoin storage pipeline.

```js
import { Storefront } from '@web3-storage/filecoin-client'

const res = await Storefront.filecoinSubmit(
  invocationConfig,
  content,
  piece
)
```

```typescript
function filecoinSubmit(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece, // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Storefront.filecoinAccept`

Signal that a submitted piece has been accepted in a Filecoin deal.

```js
import { Storefront } from '@web3-storage/filecoin-client'

const res = await Storefront.filecoinAccept(
  invocationConfig,
  content,
  piece
)
```

```typescript
function filecoinAccept(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece, // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Aggregator.pieceOffer`

Request that a piece be aggregated for inclusion in an upcoming an Filecoin deal.

```js
import { Aggregator } from '@web3-storage/filecoin-client'

const res = await Aggregator.pieceOffer(
  invocationConfig,
  piece,
  group
)
```

```typescript
function pieceOffer(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  group: string, // Aggregate grouping with different criterium like storefront
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Aggregator.pieceAccept`

Signal a piece has been accepted or rejected for inclusion in an aggregate.

```js
import { Aggregator } from '@web3-storage/filecoin-client'

const res = await Aggregator.pieceAccept(
  invocationConfig,
  piece,
  group
)
```

```typescript
function pieceAccept(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  group: string, // Aggregate grouping with different criterium like storefront
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Dealer.aggregateOffer`

Request an aggregate to be added to a deal with a Storage Provider.

```js
import { Dealer } from '@web3-storage/filecoin-client'

const res = await Dealer.aggregateOffer(
  invocationConfig,
  aggregate,
  pieces
)
```

```typescript
function aggregateOffer(
  conf: InvocationConfig,
  aggregate: Piece, // Filecoin piece representing aggregate
  pieces: Piece[],  // Filecoin pieces part of the aggregate (sorted)
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Dealer.aggregateAccept`

Signal an aggregate has been accepted for inclusion in a Filecoin deal.

```js
import { Dealer } from '@web3-storage/filecoin-client'

const res = await Dealer.aggregateAccept(
  invocationConfig,
  aggregate,
  pieces
)
```

```typescript
function aggregateAccept(
  conf: InvocationConfig,
  aggregate: Piece, // Filecoin piece representing aggregate
  pieces: Piece[],  // Filecoin pieces part of the aggregate (sorted)
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `DealTracker.dealInfo`

Get deal information for a given piece.

```js
import { DealTracker } from '@web3-storage/filecoin-client'

const add = await DealTracker.dealInfo(
  invocationConfig,
  piece
)
```

```typescript
function dealInfo(
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