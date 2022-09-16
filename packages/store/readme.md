# w3-store

This package provides implementation of uploads v2 service that can be via HTTP server. It requires several components to do it's job which must be passed during instantiation:

1. [Accounting.Provider](./store/src/type/accounting.ts#L16-L35) used to:

   1. Persist user `DID -> CID<CAR>` relationships.
   2. Query those relations.
   3. Check if CAR file for `${cid}/data` exists in file store.

   This is an interface by which "uploads" service interacts with "accounting" service through a **trusted** channel (meaning "accounting" performs no access control).

   Library includes reference implementation (not fit for production use) of this interface which can be instantiated as follows:

   ```ts
   import { Accounting } from 'w3-store'

   const accounting = Accounting.create()
   ```

   Please not above instantiation uses in-memory store and will not presist data
   across sessions. In serverless environments that means no data persisted
   across requests. You may provide presistance layer by passing optional `db`
   and `cars` options, in which case they will be used to persist state

   ```ts
   import { Accounting } from "w3-store"

   const accounting = Accounting.create({
     // Some key value store that can persist data across sessions
     db: {
       /**
        * Takes DID in string representation and expects
       * a map of CID string -> CID`
       */
       async get(key:string): Promise<undefined|Map<string, CID>> {
         // your implementation here
       }
       async set(key:string, links:Map<string, CID>>):Promise<undefined> {
         // your implementation here
       }
     },
     // store that can check if car file is in the file store
     cars: {
       async has(key:string): Promise<boolean> {
         // ....
       }
     }
   })
   ```

   Reference implementation is not fit for production, instead you should write
   your own [Accounting.Provider](./store/src/type/accounting.ts#L16-L35)
   implementation.

2. "ucanto connection" to an [Identity](./store/src/type/identity.ts#L11-L38)
   service, used to:

   1. Identify whether users with specific DID has a registered account.
   2. Redirect `identity/*` capabilities to `Identity` service.

   This is an interface by which "uploads" service interacts with "identity" service through an **untrusted** channel (meaning that "identity" service verifies
   UCANs and deny service if not authorized).

   Library includes reference implementation (not fit for production use) of the
   "identity" service which you can create and obtain in-process "ucanto connection" to it:

   ```ts
   import { Identity } from 'w3-store'

   const identity = Identity.create({
     // base64url encoded Ed25519 keypair
     keypair: process.env.W3_ID_KEYPAIR,
   })

   const connection = identity.connect()
   ```

   However above instantiation will use in-memory store, which will not presist state
   across sessions. In serverless environments that would mean no state persisted
   across requests. You may provied your own persistance layer by passing optional `db` store and `email` service for sending out tokens to verified accounts:

   ```ts
   import { Identity } from 'w3-store'

   const identity = Identity.create({
     // base64url encoded Ed25519 keypair
     id: process.env.W3_ID_KEYPAIR,
     // persistent store
     db: {
       // reads from the underlying store
       get(id: string): Promise<{ account: string; proof: CID } | null> {
         //...
       },
       // stores account info
       set(
         id: string,
         value: { account: string; proof: CID }
       ): Promise<undefined> {
         //...
       },
     },
     email: {
      send(to:string, ucanToken:string) Promise<unknown> {
        // ...
      }
     }
   })
   ```

   In production it is very likely that "upload" and "identity" services will run on different nodes. To create "ucanto connection" to an "identity" service running on different node you just need to provide service DID and URL it is listening on:

   ```ts
   import { Identity } from 'w3-store'

   const identity = Identity.connect({
     // something like did:key:z6MkqJLaQH7VNbn4d8cNZiiABK2uzMCThzMWtgU7vyrFJRe1
     id: process.env.W3_ID_DID,
     url: new URL('http://localhost:8080'),
   })
   ```

Putting all the pieces together you can create a service as follows:

```ts
import { Store, Identity, Accounting } from 'w3-store'
const service = Store.create({
  // "MgCZ+Sw7psm7xsVmvIqToSJSKcwNUextBonLkTaAycDlCVe0BoSdzzwY8vi0gpTGo7EjcTGqvWEjBOQGreE0TWpDPbWo="
  keypair: process.env.W3_STORE_KEYPAIR,
  identity: Identity.create({
    // MgCYfUUr1JN+q9mX1JEp5hteX7v+Xe2LqRCFa4iPMIgVrf+0BLGRATq2sd8qCBXb6IvKw7mi+8oKZ20gCHKtjaPPzl20=
    keypair: process.env.W3_ID_KEYPAIR,
  }),
  accounting: Accounting.create(),
  signingOptions: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
  },
})
```

Finally you can expose this service over HTTP using node as follows:

```ts
import HTTP from 'node:http'
const server = HTTP.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const { headers, body } = await provider.handleRequest({
    // @ts-ignore - node type is Record<string, string|string[]|undefined>
    headers: request.headers,
    body: Buffer.concat(chunks),
  })

  response.writeHead(200, headers)
  response.write(body)
  response.end()
})
server.listen()
```
