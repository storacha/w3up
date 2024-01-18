# `w3up`

This repo implements the web3.storage UCAN protocol [specifications](https://github.com/web3-storage/specs).

It's the core of the web3.storage server and client implementations.

## Usage

Store your files with web3.storage and retrieve them via their unique Content ID. Our tools make it simple to hash your content locally, so you can verify the service only ever stores the exact bytes you asked us to. Pick the method of using web3.storage that works for you!

### Website

Visit https://console.web3.storage and upload right from the website. 

Under the hood it uses the web3.storage client that we publish to npm to chunk and hash your files to calculate the root IPFS CID **in your browser** before sending them to https://up.web3.storage.

Once uploaded you can fetch your data from any IPFS gateway via [`https://w3s.link/ipfs/<root cid>`](https://w3s.link/ipfs/bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy)

### Command Line

Install [`@web3-storage/w3cli`](https://github.com/web3-storage/w3cli#readme) globally, authorize it to act on your behalf, create a space and upload your files. It calculates the root CID for your files locally before sending them to web3.storage.

**shell**
```shell
# verify your email to sync your existing ucan delegations to this agent.
$ w3 login alice@example.com

# create a Space, a DID namespace for your files... like a bucket.
$ w3 space create Documents

# lets go!
$ w3 up ~/Pictures/ayy-lamo.jpg
⁂ Stored 1 file
⁂ https://w3s.link/ipfs/bafybeid6gpbsqkpfrsx6b6ywrt24je4xqe4eo4y2wldisl6sk7byny5uky
```

Run `w3 --help` or have a look at https://github.com/web3-storage/w3cli to find out everything it can do.

### JS Client

Add the [`@web3-storage/w3up-client`](https://www.npmjs.com/package/@web3-storage/w3up-client) module into your project with `npm i @web3-storage/w3up-client` and upload a single file with [`client.uploadFile`](https://github.com/web3-storage/w3up/blob/main/packages/w3up-client/README.md#uploadfile) or many with [`client.uploadDirectory`](https://github.com/web3-storage/w3up/blob/main/packages/w3up-client/README.md#uploaddirectory).

If you've already got a space you can upload like this:
 
**node.js**
```js
import { filesFromPaths } from 'files-from-path'
import * as Client from '@web3-storage/w3up-client'

const [,,yourEmail, pathToAdd] = process.argv

// authorize your local agent to act on your behalf
const client = await Client.create()
await client.login(yourEmail)

// lets go!
const files = await filesFromPaths(pathToAdd)
const cid = await client.uploadDirectory(files)

console.log(`IPFS CID: ${cid}`)
console.log(`Gateway URL: https://w3s.link/ipfs/${cid}`)
```

See https://web3.storage/docs/w3up-client for a guide to using the js client for the first time.

For an interactive command line adventure into the using w3up check out `learnyouw3up` here https://github.com/web3-storage/learnyouw3up

### GitHub Action 

The Action [`add-to-web3`](https://github.com/marketplace/actions/add-to-web3) wraps [`w3cli`](https://github.com/web3-storage/w3cli) to let you add files to web3.storage from your GitHub Workflows.

**github-workflow.yaml**
```yaml
- run: npm run build # e.g output your static site to `./dist`

- uses: web3-storage/add-to-web3@v3.0.0
  id: w3up
  with:
    path_to_add: 'dist'
    secret_key: ${{ secrets.W3_PRINCIPAL }}
    proof: ${{ secrets.W3_PROOF }}

- run: echo ${{ steps.w3up.outputs.cid }}
# "bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am"
- run: echo ${{ steps.w3up.outputs.url }}
# "https://dweb.link/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am"
```

To generate a `secret_key` and delegate permissions to it as a `proof` to use in CI see: https://github.com/web3-storage/add-to-web3#generating-a-secret_key-and-proof

## Contributing

All welcome! web3.storage is open-source. See the [contributing guide](./CONTRIBUTING.md)

This project uses node v18 and `pnpm`. It's a monorepo that uses [pnpm workspaces](https://pnpm.io/workspaces) to handle resolving dependencies between the local [`packages`](https://github.com/web3-storage/w3up/tree/main/packages)

## License

Dual-licensed under [MIT + Apache 2.0](license.md)
