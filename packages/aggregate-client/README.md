<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The aggregate client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/aggregate-client` package provides the "low level" client API for aggregating data uploaded with the w3up platform. It is based on [web3-storage/specs/w3-aggregation.md])https://github.com/web3-storage/specs/blob/feat/filecoin-spec/w3-aggregation.md) and is not intended for web3.storage end users.

## Install

Install the package using npm:

```bash
npm install @web3-storage/aggregate-client
```

## Usage

### `aggregateOffer`

```ts
function aggregateOffer(
  conf: InvocationConfig,
  piece: Piece,
  offer: Piece[],
): Promise<{ status: string }>
```

Ask the service to create an aggregate offer and put it available for Storage Providers.

More information: [`InvocationConfig`](#invocationconfig)

### `aggregateGet`

```ts
function aggregateGet(
  conf: InvocationConfig,
  subject: PieceCID,
): Promise<unkown>
```

Ask the service to get deal details of an aggregate.

More information: [`InvocationConfig`](#invocationconfig)

## Types

### `Piece`

An offered CAR to be part of an Aggregate.

```ts
export interface Piece {
  link: PieceCID
  size: number
}

export type PieceCID = ReturnType<typeof CommP.toCID>
```

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
