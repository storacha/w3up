<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access api for <a href="https://web3.storage">https://web3.storage</a></p>

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

## Migrations

### Create migration

```bash
pnpm exec wrangler d1 migrations create __D1_BETA__ "<description>"
```

This will create a new file inside the `migrations` folder where you can write SQL.

