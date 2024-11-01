# Contributing

Join in. All welcome! storacha.network is open-source. The code is dual-licensed under [MIT + Apache 2.0](license.md)

This project uses node v18 and `pnpm`. It's a monorepo that use [pnpm workspaces](https://pnpm.io/workspaces) to handle resolving dependencies between the local `packages/*` folders.

If you're opening a pull request, please see the [guidelines](#how-should-i-write-my-commits) on structuring your commit messages so that your PR will be compatible with our [release process](#release-process).

## Setup a development environment

We use `pnpm` in this project and commit the `pnpm-lock.yaml` file.

```bash
# install all dependencies in the mono-repo
pnpm install
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

[Release Please](https://github.com/googleapis/release-please) automates CHANGELOG generation, the creation of GitHub releases, and version bumps for our packages. Release Please does so by parsing your git history, looking for [Conventional Commit messages](https://www.conventionalcommits.org/),
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

