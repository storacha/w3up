# Contributing

Join in. All welcome! storacha.network is open-source. The code is dual-licensed under [MIT + Apache 2.0](license.md)

This project uses node v18 and `pnpm`. It's a monorepo that use [pnpm workspaces](https://pnpm.io/workspaces) to handle resolving dependencies between the local `packages/*` folders.

If you're opening a pull request, please see the [guidelines](#how-should-i-write-my-commits) on structuring your commit messages so that your PR will be compatible with our [release process](#release-process).

## Setup a development environment

We use [`pnpm`](https://pnpm.io/) in this project and commit the
`pnpm-lock.yaml` file. We manage our packages and tasks within `pnpm` using
[`nx`](https://nx.dev/).

```bash
# install all dependencies in the mono-repo
pnpm install
# setup environment variables
cp .env.tpl .env
```

The individual packages may have additional setup instructions, and include specific usage information. You are also encouraged to set up your IDE with linting and formatting to ensure your commits can be merged.

### VS Code config

To install the recommended extensions, if you're not prompted automatically, run
`Extensions: Show Recommended Extensions`. In particular, make sure you install
[Workspace
Config+](https://marketplace.visualstudio.com/items?itemName=Swellaby.workspace-config-plus),
which merges the shared config with any local config to produce the workspace
settings.

To override any settings locally, but specifically in this repo, create a
`.vscode/settings.local.json` file. For more information, see the [`.vscode`
README](./.vscode/README.md).

## Running tasks

Use `nx` to run a task within a project. This ensures that dependency tasks run
first. `nx` is installed with `pnpm`, so it typically must be run as `pnpm nx`.
This zsh/bash function will make it work as just `nx`; in a `pnpm` repo it will
call `pnpm nx`, and elsewhere it will attempt to call the global `nx`. Add it to
your `.zshrc`/`.bashrc` to use it.

```sh
nx() {
  if [[ -f pnpm-lock.yaml ]]; then
    pnpm nx "$@"
  else
    command nx "$@"
  fi
}
```

Some examples of useful things to run:

```sh
# Build a single package
nx build @storacha/ui-react
# ...or, equivalently
nx run @storacha/ui-react:build

# Build all packages
nx run-many -t build

# Run tests on anything that's changed in the current branch
nx affected -t test

# Lint everything whenever files change
nx watch --all -- nx run-many -t lint

# Run a set of tasks to the first failure whenever files change
scripts/nx-watch-run typecheck lint build test
```

## Release Process

_🚧 Under reconstruction 🚧_

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
