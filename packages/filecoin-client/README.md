<h1 align="center">🐔<br/>storacha.network</h1>
<p align="center">The w3filecoin client for <a href="https://storacha.network">https://storacha.network</a></p>

## About

The `@storacha/filecoin-client` package provides the "low level" client API to make data uploaded with the w3up platform available in Filecoin Storage providers. It is based on [storacha/specs/w3-filecoin.md](https://github.com/storacha/specs/blob/main/w3-filecoin.md) and is not intended for storacha.network end users.

## Install

Install the package using npm:

```bash
npm install @storacha/filecoin-client
```

## Usage

### `Storefront.filecoinOffer`

The [`filecoin/offer`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinoffer) task can be executed to request storing a content piece in Filecoin. It issues a signed receipt of the execution result.

A receipt for successful execution will contain an effect, linking to a `filecoin/submit` task that will complete asynchronously.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Storefront } from '@storacha/filecoin-client'

const res = await Storefront.filecoinOffer(invocationConfig, content, piece)
```

```typescript
function filecoinOffer(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Storefront.filecoinSubmit`

The [`filecoin/submit`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinsubmit) task is an _effect_ linked from successful execution of a `filecoin/offer` task, it is executed to issue a receipt for the success or failure of the task.

A receipt for successful execution indicates that the offered piece has been submitted to the pipeline. In this case the receipt will contain an effect, linking to a `piece/offer` task that will complete asynchronously.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Storefront } from '@storacha/filecoin-client'

const res = await Storefront.filecoinSubmit(invocationConfig, content, piece)
```

```typescript
function filecoinSubmit(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Storefront.filecoinAccept`

The [`filecoin/accept`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#filecoinsubmit) task is an _effect_ linked from successful execution of a `filecoin/offer` task, it is executed to issue a receipt for the success or failure of the task.

A receipt for successful execution indicates that the offered piece has been accepted in a Filecoin deal. In this case the receipt will contain proofs that the piece was included in an aggregate and deal.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Storefront } from '@storacha/filecoin-client'

const res = await Storefront.filecoinAccept(invocationConfig, content, piece)
```

```typescript
function filecoinAccept(
  conf: InvocationConfig,
  content: Link, // Content CID
  piece: Piece // Filecoin piece
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Aggregator.pieceOffer`

The [`piece/offer`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#pieceoffer) task can be executed to request that a piece be aggregated for inclusion in an upcoming an Filecoin deal. It issues a signed receipt of the execution result. It is _also_ an effect linked from successful execution of a `filecoin/submit` task.

A receipt for successful execution will contain an effect, linking to a `piece/accept` task that will complete asynchronously.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Aggregator } from '@storacha/filecoin-client'

const res = await Aggregator.pieceOffer(invocationConfig, piece, group)
```

```typescript
function pieceOffer(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  group: string // Aggregate grouping with different criterium like storefront
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Aggregator.pieceAccept`

The [`piece/accept`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#pieceaccept) task is an _effect_ linked from successful execution of a `piece/offer` task, it is executed to issue a receipt for the success or failure of the task.

A receipt for successful execution indicates that the offered piece was included in an aggregate. In this case the receipt will contain the aggregate piece CID and a proof that the piece was included in the aggregate. It also includes an effect, linking to an `aggregate/offer` task that will complete asynchronously.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Aggregator } from '@storacha/filecoin-client'

const res = await Aggregator.pieceAccept(invocationConfig, piece, group)
```

```typescript
function pieceAccept(
  conf: InvocationConfig,
  piece: Piece, // Filecoin piece
  group: string // Aggregate grouping with different criterium like storefront
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Dealer.aggregateOffer`

The [`aggregate/offer`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#aggregateoffer) task can be executed to request an aggregate be added to a deal with a Storage Provider. It issues a signed receipt of the execution result. It is _also_ an effect linked from successful execution of a `piece/accept` task.

A receipt for successful execution will contain an effect, linking to an `aggregate/accept` task that will complete asynchronously.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { Dealer } from '@storacha/filecoin-client'

const res = await Dealer.aggregateOffer(invocationConfig, aggregate, pieces)
```

```typescript
function aggregateOffer(
  conf: InvocationConfig,
  aggregate: Piece, // Filecoin piece representing aggregate
  pieces: Piece[] // Filecoin pieces part of the aggregate (sorted)
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `Dealer.aggregateAccept`

The [`aggregate/accept`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#aggregateaccept) task is an _effect_ linked from successful execution of a `aggregate/offer` task, it is executed to issue a receipt for the success or failure of the task.

A receipt for successful execution indicates that an aggregate has been accepted for inclusion in a Filecoin deal. In this case the receipt will contain proofs that the piece was included in an aggregate and deal.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure, as well as multiple effects, linking to `piece/offer` tasks that will retry _valid_ pieces and complete asynchronously.

```js
import { Dealer } from '@storacha/filecoin-client'

const res = await Dealer.aggregateAccept(invocationConfig, aggregate, pieces)
```

```typescript
function aggregateAccept(
  conf: InvocationConfig,
  aggregate: Piece, // Filecoin piece representing aggregate
  pieces: Piece[] // Filecoin pieces part of the aggregate (sorted)
): Promise<Receipt>
```

More information: [`InvocationConfig`](#invocationconfig)

### `DealTracker.dealInfo`

The [`deal/info`](https://github.com/storacha/specs/blob/main/w3-filecoin.md#dealinfo) task can be executed to request deal information for a given piece. It issues a signed receipt of the execution result.

A receipt for successful execution will contain details of deals the provided piece CID is currently active in.

Otherwise the task is failed and the receipt will contain details of the reason behind the failure.

```js
import { DealTracker } from '@storacha/filecoin-client'

const add = await DealTracker.dealInfo(invocationConfig, piece)
```

```typescript
function dealInfo(
  conf: InvocationConfig,
  piece: Piece // Filecoin piece to check
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

Feel free to join in. All welcome. Please [open an issue](https://github.com/storacha/upload-service/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/storacha/upload-service/blob/main/license.md)
