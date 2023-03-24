# w3up UCAN Protocol

Implementation of the w3up UCAN protocols.

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/web3-storage/w3-protocol/issues/new)!

If you're opening a pull request, please see the [guidelines](#how-should-i-write-my-commits) on structuring your commit messages so that your PR will be compatible with our [release process](#release-process).

### Setup a development environment

We use `pnpm` in this project and commit the `pnpm-lock.yaml` file.

```bash
# install all dependencies in the mono-repo
pnpm install
# setup git hooks
npx simple-git-hooks
# setup environment variables
cp .env.tpl .env
```

The individual packages may have additional setup instructions, and include specific usage information.
You are also encouraged to set up your IDE with linting and formatting to ensure your commits can be merged.

### Vscode config

Install these extensions

- https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
- Optional toggle for formatting https://marketplace.visualstudio.com/items?itemName=tombonnike.vscode-status-bar-format-toggle

Add these lines to your vscode workspace settings at `.vscode/settings.json`

```text
  "javascript.format.enable": false,
  "typescript.format.enable": false,
  "editor.formatOnPaste": true,
  "editor.formatOnType": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
```

## Release Process

[Release Please](https://github.com/googleapis/release-please) automates CHANGELOG generation, the creation of GitHub releases,
and version bumps for our packages. Release Please does so by parsing your
git history, looking for [Conventional Commit messages](https://www.conventionalcommits.org/),
and creating release PRs.

### What's a Release PR?

Rather than continuously releasing what's landed to our default branch, release-please maintains Release PRs:

These Release PRs are kept up-to-date as additional work is merged. When we're ready to tag a release, we simply merge the release PR.

When the release PR is merged the release job is triggered to create a new tag, a new github release and run other package specific jobs. Only merge ONE release PR at a time and wait for CI to finish before merging another.

Release PRs are created individually for each package in the mono repo.

### How should I write my commits?

Release Please assumes you are using [Conventional Commit messages](https://www.conventionalcommits.org/).

The most important prefixes you should have in mind are:

- `fix:` which represents bug fixes, and correlates to a [SemVer](https://semver.org/)
  patch.
- `feat:` which represents a new feature, and correlates to a SemVer minor.
- `feat!:`, or `fix!:`, `refactor!:`, etc., which represent a breaking change
  (indicated by the `!`) and will result in a SemVer major.

## Deployments

### Access API

There's 3 environments production, staging and dev. The URLs are:

- Production: https://access.web3.storage
- Staging: https://w3access-staging.protocol-labs.workers.dev
- Dev: https://w3access-dev.protocol-labs.workers.dev

The history and the current deployed commits can be checked at https://github.com/web3-storage/w3-protocol/deployments. The deployed commit hash for each environment can also be checked directly in the API .ie [`https://access.web3.storage/version`](https://access.web3.storage/version).

#### Deployment Flow

1. Each PR deploys to `dev`, we should add support for unique deployments and remove `dev` completely.
2. Each Access API **Release** PR deploys to `staging` every time the CI runs for that PR.
   - Note: Any change to the folder `packages/access-api` will update the Access API release PR and trigger a new deployment to `staging`.
3. After merging an Access API release PR to `main` CI will deploy to `production`.

#### Reverting a bad deployment

When something bad is deployed to any environment it can be reverted by going to the [Manual Deploy Workflow](https://github.com/web3-storage/w3-protocol/actions/workflows/manual.yml) select a branch or tag, the package (in this case `access-api`) and the environment and run the workflow.

## License

Dual-licensed under [MIT + Apache 2.0](license.md)
