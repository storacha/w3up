<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The w3filecoin client for <a href="https://web3.storage">https://web3.storage</a></p>

## About

The `@web3-storage/w3filecoin-client` package provides the "low level" client API to make data uploaded with the w3up platform available in Filecoin Storage providers. It is based on [web3-storage/specs/w3-filecoin.md])https://github.com/web3-storage/specs/blob/feat/filecoin-spec/w3-filecoin.md) and is not intended for web3.storage end users.

## Install

Install the package using npm:

```bash
npm install @web3-storage/w3filecoin-client
```

## Usage

TODO

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