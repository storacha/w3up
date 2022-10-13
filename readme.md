# Web3 Storage Ucan Protocol

## Contributing

We use `pnpm` in this project and commit the `pnpm-lock.yaml` file.

### Install dependencies.

```bash
# install all dependencies in the mono-repo
pnpm install
# setup git hooks
npx simple-git-hooks
```

## Deployments 

### Access API

There's 3 environments prodution, staging and dev. The URLs are:
- Prodution: https://access-api.web3.storage
- Staging: https://access-api-staging.web3.storage
- Dev: https://w3access-dev.protocol-labs.workers.dev

The history and the current deployed commits can be check at https://github.com/web3-storage/w3-protocol/deployments. The deployed commit hash for each environment can also be checked directly in the API .ie [`https://access-api.web3.storage/version`](https://access-api.web3.storage/version).

#### Deployment Flow
1. Each PR deploys to `dev`, we should add support for unique deployments and remove `dev` completely.
2. Each Access API **Release** PR deploys to `staging` every time the CI runs for that PR.
   - Note: Any change to the folder `packages/access-api` will update the Access API release PR and trigger a new deployment to `staging`.
3. After merging an Access API release PR to `main` CI will deploy to `prodution`.

#### Reverting a bad deployment
When something bad is deployed to any environment it can be reverted by going to the [Manual Deploy Workflow](https://github.com/web3-storage/w3-protocol/actions/workflows/manual.yml) select a branch or tag, the package (in this case `access-api`) and the environment and run the workflow.
