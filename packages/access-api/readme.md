<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access api for <a href="https://web3.storage">https://web3.storage</a></p>

## Development

Run the root [instructions](../../readme.md#setup-a-development-environment) first.
Review the repo-wide `.env` file copied in those steps and fill in real API keys for any services you plan to test against.

```bash
# Run api locally
pnpm run dev

# Lint and typecheck
pnpm run lint

# Run tests
pnpm run test
```

The API server is currently hardcoded to listen on port 8787 on unspecified (i.e. typically: all) network interfaces.

## Migrations

### Create migration

```bash
pnpm exec wrangler d1 migrations create __D1_BETA__ "<description>"
```

This will create a new file inside the `migrations` folder where you can write SQL.

