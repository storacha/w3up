<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">api <a href="https://microservices.io/patterns/apigateway.html">gateway</a> for <a href="https://web3.storage">https://web3.storage</a></p>

## What

* proxies ucanto invocations to upstream services
  * `voucher/*` -> `@web3-storage/access-api`
  * `space/*` -> `@web3-storage/access-api`
  * `store/*` -> `@web3-storage/upload-api`
  * `upload/*` -> `@web3-storage/upload-api`

## Development

Run the root [instructions](../../readme.md#setup-a-development-environment) first.

```bash
# Run api locally
pnpm run dev

# Lint and typecheck
pnpm run lint

# Run tests
pnpm run test
```
