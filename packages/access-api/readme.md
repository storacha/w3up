<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access api for <a href="https://web3.storage">https://web3.storage</a></p>

# Development

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

The dev API server is currently hardcoded to listen on port 8787 on unspecified (i.e. typically: all) network interfaces.

# Migrations

## Create migration

```bash
pnpm exec wrangler d1 migrations create __D1_BETA__ "<description>"
```

This will create a new file inside the `migrations` folder where you can write SQL.

# Sourcemaps

Sourcemaps work locally but on deployed environments they won't because Cloudflare forces bundling while D1 is in beta. Check this setting [here](https://github.com/web3-storage/w3protocol/blob/187428e5ca5e8af5ac24bdeebf06199c3299f3af/packages/access-api/wrangler.toml#L11).

Sentry sourcemaps also don't show the proper source stacktraces for the same reason.

If you encounter a situation where sourcemaps don't work properly locally please open an issue and check if `no_bundle` to `true` in wrangler.toml helps.

Tracking issue for this problem https://github.com/web3-storage/w3protocol/issues/112.
