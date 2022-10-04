## `w3up-client`

> A client SDK for the w3up service, providing content addressed storage for any application.

`w3up-client` is a JavaScript libary that provides a convenient interface to the w3up platform, a simple "on-ramp" to the content-addressed decentralized IPFS network. 

## Install

`w3up-client` is currently available as an alpha release and should be installed directly from GitHub. These instructions will be updated once the package is available on `npm`.

You can add `w3up-client` to your JavaScript or TypeScript project with `npm`:

```sh
npm install @web3-storage/w3up-client
```

Or with `yarn`:

```
yarn add @web3-storage/w3up-client

```

## Basic Usage

This section shows some of the basic operations available in the `w3up-client` package. For a full API reference, see [API.md](./API.md) or the source code of the [`w3up-cli` package][w3up-cli-github], which uses `w3up-client` throughout.

### Creating a client object

The API provides a `createClient` function that returns a `Client` object. To call `createClient`, you'll need to collect a few pieces of information and provide a `ClientOptions` object, which looks like this:

```ts
type ClientOptions = {
  /** The DID of the w3up service */
  serviceDID: string,

  /** The URL of the w3up service */
  serviceURL: string,

  /** The DID of the access service */
  accessDID: string,

  /** The URL of the access service */
  accessURL: string,

  /** A Map of configuration settings for the client */
  settings: Map<string, any>
}
```

The client needs the URL and DID (Decentralized Identity Document) for two services. The w3up service provides the main storage functionality, while the access service provides account registration and authorization services.

Here are the values for the production w3up and access services:

| Service | URL | DID |
|---------|-----|-----|
| w3up | `https://8609r1772a.execute-api.us-east-1.amazonaws.com` | `did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z` |
| access | `https://access-api.web3.storage` | `did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9` |

And here's an example of calling `createClient` with the correct values for the production services:

```js
import { createClient } from '@web3-storage/w3up-client/w3up-client'

const client = createClient({
  serviceDID: 'did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z',
  serviceURL: 'https://8609r1772a.execute-api.us-east-1.amazonaws.com',
  accessDID: 'did:key:z6MkkHafoFWxxWVNpNXocFdU6PL2RVLyTEgS1qTnD3bRP7V9',
  accessURL: 'https://access-api.web3.storage',
  settings: new Map(),
})
```

Note that we're providing an empty `settings` map, which means that our client won't have an associated identity keypair. See [Registration and identity](#registration-and-identity) below to learn about registration.

Once you've registered an identity, `client.settings` will contain your secret identity key and the registered email address, along with some other important information. To use the identity in the future, you'll need to persist the settings map to disk somehow and pass in the saved settings to `createClient`. Note that the settings map contains several binary `Uint8Array` values, so whatever you use to serialize to disk must support binary data (e.g. [CBOR](https://cbor.io), JSON with base64-encoded binary support, etc).

### Registration and identity

Before you can upload data, you'll need to register an identity keypair with the access service.

To do this, call the async `register` method, which takes an email address as input. Calling `register` will cause an email to be sent to the given address, and it will wait until the validation link in the email is clicked by a user. If the user successfully validates the email, `register` will resolve successfully, and you can use the service to upload data.

Note that registration may fail, for example, if the user does not click the link before it expires. Be sure to check for errors when calling `client.register`.

```js
import { createClient } from '@web3-storage/w3up-client/w3up-client'

async function tryToRegister(emailAddress) {
  // CLIENT_OPTS should be defined as described in "Creating a client object"
  const client = createClient(CLIENT_OPTS) 
  try {
    const successMessage = await client.register(emailAddress)
    console.log('Success: ', successMessage)
  } catch (err) {
    console.error('Registraton failed:', err)
  }
}
```

You can retrieve the identity keypair for the client by calling the `identity` method. This is an async method that will create the key if does not already exist in the client's `settings` map. The `identity` method returns an `Authority` from the [`ucanto` library][ucanto]. `ucanto` provides an RPC framework using UCANs, which `w3up-client` uses under the hood.


The final identity-related client method is `whoami`, which queries the access service to see if your id has been registered, and returns the registered identity.

### Uploading data

The `upload` method sends your data to the w3up service, making it available for retreival on [Elastic IPFS][elastic-ipfs].

```js
import { createClient } from '@web3-storage/w3up-client/w3up-client'

async function uploadCAR(carData) {
  // CLIENT_OPTS should be defined as described in "Creating a client object"
  const client = createClient(CLIENT_OPTS)

  try {
    const successMessage = await client.upload(carData)
    console.log(successMessage)
  } catch (err) {
    console.error(`upload error: ${err}`)
  }
}
```

Currently, the `upload` method accepts data in [CAR][car-spec] format. CARs are "content archives" that contain blocks of content-addressed data in an "IPFS native" format. 

We expect to add CAR generation as a feature of this library in a future release. In the meantime, please see the guide to [working with Content Archives][web3storage-docs-cars] on the [Web3.Storage docs](https://web3.storage/docs) site for ways to prepare CAR data. You can also use the [`w3up-cli` tool][w3up-cli-github] to generate CAR data using the `generate-car` command.

### Listing uploads

The `list` method returns an array of CID strings for each upload you've made to your account.

```js
import { createClient } from '@web3-storage/w3up-client/w3up-client'

async function listUploads() {
  // CLIENT_OPTS should be defined as described in "Creating a client object"
  const client = createClient(CLIENT_OPTS)
  const cids = await client.list()
  for (const cid of cids) {
    console.log('CID:', cid)
  }
}
```

### Removing / unlinking uploads from your account

The `remove` method takes a CID string and "unlinks" it from your account.

```js
import { createClient } from '@web3-storage/w3up-client/w3up-client'

async function tryRemove(cid) {
  // CLIENT_OPTS should be defined as described in "Creating a client object"
  const client = createClient(CLIENT_OPTS)

  try {
    client.remove(cid)
  } catch (err) {
    console.error(`error removing CID ${cid}: ${err}`)
  }
}
```

**Important:** the `remove` method does not delete your data from the public IPFS network, Filecoin, or other decentralized storage systems used by w3up. Data that has been `remove`d and is not linked to any other accounts _may_ eventually be deleted from the internal storage systems used by the w3up service, but there are no guarantees about when (or whether) that will occur, and you should not depend on data being permanently deleted.


[w3up-cli-github]: https://github.com/web3-storage/w3up-cli
[elastic-ipfs]: https://github.com/elastic-ipfs/elastic-ipfs 
[ucanto]: https://github.com/web3-storage/ucanto
[car-spec]: https://ipld.io/specs/transport/car/
[web3storage-docs-cars]: https://web3.storage/docs/how-tos/work-with-car-files/
