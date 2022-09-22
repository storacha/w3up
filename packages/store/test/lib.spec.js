import { describe, it } from 'mocha'
import { assert } from './test.js'
import * as API from '@ucanto/interface'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Capabilities from '@web3-storage/access/capabilities'
import { SigningPrincipal } from '@ucanto/principal'

import { Store, Access, Accounting } from '../src/lib.js'
import { alice, bob, service, service as validator } from './fixtures.js'
import { listen, makeMockAccessServer } from './helpers.js'

describe('Store', () => {
  let storeService
  let storeServer

  before(async () => {
    const s3 = new Map()
    const w3 = await SigningPrincipal.generate()
    const access = await makeMockAccessServer({ id: w3 })

    // start w3-store service
    storeService = Store.create({
      keypair: SigningPrincipal.format(await SigningPrincipal.generate()),
      identity: Access.connect({
        id: w3.did(),
        //       url: new URL('http://localhost:12345'),
        url: access.url,
      }),
      accounting: Accounting.create({ cars: s3 }),
      signingOptions: {
        accessKeyId: 'id',
        secretAccessKey: 'secret',
        region: 'us-east-2',
        //         bucket: 'my-test-bucket',
      },
    })

    storeServer = await listen(storeService)
  })
  it('should connect to the store', async () => {
    // This is something that client like CLI will do
    const store = Store.connect({
      id: storeService.id.did(),
      url: storeServer.url,
    })

    const car = await CAR.codec.write({
      roots: [await CBOR.codec.write({ hello: 'world' })],
    })

    // errors if not registered
    const invocation = Capabilities.identityIdentify.invoke({
      issuer: alice,
      audience: store.id,
      with: alice.did(),
    })

    try {
      const result = await invocation.execute(store)
      assert.containSubset(result, {
        error: true,
        name: 'NotRegistered',
        message: `No account is registered for ${alice.did()}`,
      })
    } catch (error) {
      console.log('hi', error)
    }
  })
})

// test('main', async () => {
//   const s3 = new Map()
//   const w3 = await SigningPrincipal.generate()
//
//   // start w3-identity service
//   //   const identityService = Identity.create({
//   //     keypair: SigningPrincipal.format(w3),
//   //   })
//   const identityServer = await listen(async ({ request }) => {
//     return request
//   })
//
//   // start w3-store service
//   const storeService = Store.create({
//     keypair: SigningPrincipal.format(await SigningPrincipal.generate()),
//     identity: Access.connect({
//       id: w3.did(),
//       //       url: new URL('http://localhost:12345'),
//       url: identityServer.url,
//     }),
//     accounting: Accounting.create({ cars: s3 }),
//     signingOptions: {
//       accessKeyId: 'id',
//       secretAccessKey: 'secret',
//       region: 'us-east-2',
//       bucket: 'my-test-bucket',
//     },
//   })
//
//   const storeServer = await listen(storeService)
//
//   try {
//     // This is something that client like CLI will do
//     const store = Store.connect({
//       id: storeService.id.did(),
//       url: storeServer.url,
//     })
//
//     const car = await CAR.codec.write({
//       roots: [await CBOR.codec.write({ hello: 'world' })],
//     })
//
//     // errors if not registered
//     {
//       const result = await Capabilities.storeAdd
//         .invoke({
//           issuer: alice,
//           audience: store.id,
//           with: alice.did(),
//           caveats: { link: car.cid },
//         })
//         .execute(store)
//
//       assert.containSubset(result, {
//         error: true,
//         name: 'NotRegistered',
//         message: `No account is registered for ${alice.did()}`,
//       })
//     }
//
//     // can not register without a proof
//     {
//       // service delegates to the validator
//       const validatorToken = await Client.delegate({
//         issuer: w3,
//         audience: validator,
//         capabilities: [
//           {
//             can: 'access/register',
//             with: 'mailto:*',
//             as: 'did:*',
//           },
//         ],
//       })
//
//       // validator after validation delegates to alice
//       const registrationToken = await Client.delegate({
//         issuer: validator,
//         audience: alice,
//         capabilities: [
//           {
//             can: 'access/register',
//             with: 'mailto:alice@web.mail',
//             as: alice.did(),
//           },
//         ],
//         proofs: [validatorToken],
//       })
//
//       const result = await Capabilities.identityRegister
//         .invoke({
//           issuer: alice,
//           audience: store.id,
//           with: 'mailto:alice@web.mail',
//           caveats: {
//             as: alice.did(),
//           },
//           proofs: [registrationToken],
//         })
//         .execute(store)
//
//       assert.deepEqual(result, null)
//     }
//
//     // alice should be able to check her identity
//     {
//       const result = await Capabilities.identityIdentify
//         .invoke({
//           issuer: alice,
//           audience: store.id,
//           with: alice.did(),
//         })
//         .execute(store)
//
//       assert.match(String(result), /did:ipld:bafy/)
//     }
//
//     // now that alice is registered she can add a car file
//     {
//       const result = await Capabilities.storeAdd
//         .invoke({
//           issuer: alice,
//           audience: store.id,
//           with: alice.did(),
//           caveats: { link: car.cid },
//         })
//         .execute(store)
//
//       assert.containSubset(result, {
//         status: 'upload',
//         with: alice.did(),
//         link: car.cid,
//       })
//
//       // eslint-disable-next-line unicorn/new-for-builtins
//       assert.match(Object(result).url, /https:.*s3.*amazon/)
//     }
//
//     // if alice adds a car that is already in s3 no upload will be needed
//     {
//       const car = await CAR.codec.write({
//         roots: [await CBOR.codec.write({ another: 'car' })],
//       })
//
//       // add car to S3
//       s3.set(`${car.cid}/data`, true)
//
//       const result = await Capabilities.storeAdd
//         .invoke({
//           issuer: alice,
//           audience: store.id,
//           with: alice.did(),
//           caveats: { link: car.cid },
//         })
//         .execute(store)
//
//       assert.containSubset(result, {
//         status: 'done',
//         with: alice.did(),
//         link: car.cid,
//         url: undefined,
//       })
//     }
//
//     // bob can not store/add into alice's group
//     {
//       const result = await Capabilities.storeAdd
//         .invoke({
//           issuer: bob,
//           audience: store.id,
//           with: alice.did(),
//           caveats: {
//             link: car.cid,
//           },
//         })
//         .execute(store)
//
//       assert.containSubset(result, {
//         error: true,
//         name: 'Unauthorized',
//       })
//     }
//
//     // but if alice delegates capability to bob we can add to alice's group
//     {
//       const result = await Capabilitie.storeAdd
//         .invoke({
//           issuer: bob,
//           audience: store.id,
//           with: alice.did(),
//           caveats: { link: car.cid },
//           proofs: [
//             await Client.delegate({
//               issuer: alice,
//               audience: bob,
//               capabilities: [
//                 {
//                   can: 'store/add',
//                   with: alice.did(),
//                 },
//               ],
//             }),
//           ],
//         })
//         .execute(store)
//
//       assert.containSubset(result, {
//         with: alice.did(),
//         link: car.cid,
//       })
//     }
//   } finally {
//     storeServer.close()
//     //     identityServer.close()
//   }
// })
//
