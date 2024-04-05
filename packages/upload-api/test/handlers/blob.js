import * as API from '../../src/types.js'
import { equals } from 'uint8arrays'
import pDefer from 'p-defer'
import { Absentee } from '@ucanto/principal'
import { Message, Receipt } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import { CAR } from '@ucanto/transport'
import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import * as UCAN from '@web3-storage/capabilities/ucan'
import { base64pad } from 'multiformats/bases/base64'

import { provisionProvider } from '../helpers/utils.js'
import { createServer, connect } from '../../src/lib.js'
import { alice, bob, createSpace, registerSpace } from '../util.js'
import { BlobItemSizeExceededName } from '../../src/blob/lib.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'blob/add executes allocation and returns effects for allocate (and its receipt), accept and put':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // invoke `blob/add`
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await invocation.execute(connection)
      if (!blobAdd.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      // Validate receipt
      assert.ok(blobAdd.out.ok.claim)
      assert.ok(
        blobAdd.out.ok.claim['await/ok'].equals(blobAdd.fx.join?.link())
      )
      assert.ok(blobAdd.fx.join)

      /**
       * @type {import('@ucanto/interface').Invocation[]}
       **/
      // @ts-expect-error read only effect
      const forkInvocations = blobAdd.fx.fork
      assert.equal(blobAdd.fx.fork.length, 3)
      const allocatefx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === BlobCapabilities.allocate.can
      )
      const allocateUcanConcludefx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === UCAN.conclude.can
      )
      const putfx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === BlobCapabilities.put.can
      )
      if (!allocatefx || !allocateUcanConcludefx || !putfx) {
        throw new Error('effects not provided')
      }

      // validate facts exist for `http/put`
      assert.ok(putfx.facts.length)
      const [{ bytes, did }] = putfx.facts
      assert.ok(bytes)
      assert.ok(did)

      // Validate `http/put` invocation stored
      const httpPutGetTask = await context.tasksStorage.get(putfx.cid)
      assert.ok(httpPutGetTask.ok)

      // validate scheduled allocate task ran an its receipt content
      const messageCar = CAR.codec.decode(
        // @ts-expect-error object of type unknown
        allocateUcanConcludefx.capabilities[0].nb.bytes
      )
      const message = Message.view({
        root: messageCar.roots[0].cid,
        store: messageCar.blocks,
      })

      const receiptKey = Array.from(message.receipts.keys())[0]
      const receipt = message.receipts.get(receiptKey)
      assert.ok(receipt?.out)
      assert.ok(receipt?.out.ok)
      // @ts-expect-error receipt out is unknown
      assert.equal(receipt?.out.ok?.size, size)
      // @ts-expect-error receipt out is unknown
      assert.ok(receipt?.out.ok?.address)
    },
    'blob/add executes allocation and returns effects for allocate (and its receipt) and accept, but not for put when blob stored':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocation
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })
      // Invoke `blob/add` for the first time
      const firstBlobAdd = await invocation.execute(connection)
      if (!firstBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: firstBlobAdd })
      }

      // Validate receipt
      assert.ok(firstBlobAdd.out.ok)
      assert.ok(firstBlobAdd.fx.join)
      assert.equal(firstBlobAdd.fx.fork.length, 3)

      // Store allocate receipt
      /**
       * @type {import('@ucanto/interface').Invocation[]}
       **/
      // @ts-expect-error read only effect
      const forkInvocations = firstBlobAdd.fx.fork
      const allocateUcanConcludefx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === UCAN.conclude.can
      )
      const putfx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === BlobCapabilities.put.can
      )
      if (!allocateUcanConcludefx || !putfx) {
        throw new Error('effects not provided')
      }
      const messageCar = CAR.codec.decode(
        // @ts-expect-error object of type unknown
        allocateUcanConcludefx.capabilities[0].nb.bytes
      )
      const message = Message.view({
        root: messageCar.roots[0].cid,
        store: messageCar.blocks,
      })
      const receiptKey = Array.from(message.receipts.keys())[0]
      const receipt = message.receipts.get(receiptKey)
      if (!receipt) {
        throw new Error('receipt should be available')
      }
      const receiptPutRes = await context.receiptsStorage.put(receipt)
      assert.ok(receiptPutRes.ok)

      // Invoke `blob/add` for the second time (without storing the blob)
      const secondBlobAdd = await invocation.execute(connection)
      if (!secondBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: secondBlobAdd })
      }

      // Validate receipt has still 3 effects
      assert.ok(secondBlobAdd.out.ok)
      assert.ok(secondBlobAdd.fx.join)
      assert.equal(secondBlobAdd.fx.fork.length, 3)

      /** @type {import('@web3-storage/capabilities/types').BlobAddress} */
      // @ts-expect-error receipt type is unknown
      const address = receipt.out.ok.address

      // Store the blob to the address
      const goodPut = await fetch(address.url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: address.headers,
      })
      assert.equal(goodPut.status, 200, await goodPut.text())

      // Invoke `blob/add` for the third time (after storing the blob)
      const thirdBlobAdd = await invocation.execute(connection)
      if (!thirdBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: thirdBlobAdd })
      }

      // Validate receipt has now only 2 effects
      assert.ok(thirdBlobAdd.out.ok)
      assert.ok(thirdBlobAdd.fx.join)
      assert.equal(thirdBlobAdd.fx.fork.length, 2)

      /**
       * @type {import('@ucanto/interface').Invocation[]}
       **/
      // @ts-expect-error read only effect
      const thirdForkInvocations = thirdBlobAdd.fx.fork
      // no put effect anymore
      assert.ok(!thirdForkInvocations.find(
        (fork) => fork.capabilities[0].can === BlobCapabilities.put.can
      ))
    },
  'blob/add fails when a blob with size bigger than maximum size is added':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // invoke `blob/add`
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size: Number.MAX_SAFE_INTEGER,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await invocation.execute(connection)
      if (!blobAdd.out.error) {
        throw new Error('invocation should have failed')
      }
      assert.ok(blobAdd.out.error, 'invocation should have failed')
      assert.equal(blobAdd.out.error.name, BlobItemSizeExceededName)
    },
  'blob/allocate allocates to space and returns presigned url': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)

    // prepare data
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const content = multihash.bytes
    const digest = multihash.digest
    const size = data.byteLength

    // create service connection
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // create `blob/add` invocation
    const blobAddInvocation = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          content,
          size,
        },
      },
      proofs: [proof],
    })

    // invoke `service/blob/allocate`
    const serviceBlobAllocate = BlobCapabilities.allocate.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          content,
          size,
        },
        cause: (await blobAddInvocation.delegate()).cid,
        space: spaceDid,
      },
      proofs: [proof],
    })
    const blobAllocate = await serviceBlobAllocate.execute(connection)
    if (!blobAllocate.out.ok) {
      throw new Error('invocation failed', { cause: blobAllocate })
    }

    // Validate response
    assert.equal(blobAllocate.out.ok.size, size)
    assert.ok(blobAllocate.out.ok.address)
    assert.ok(blobAllocate.out.ok.address?.headers)
    assert.ok(blobAllocate.out.ok.address?.url)
    assert.equal(
      blobAllocate.out.ok.address?.headers?.['content-length'],
      String(size)
    )
    assert.deepEqual(
      blobAllocate.out.ok.address?.headers?.['x-amz-checksum-sha256'],
      base64pad.baseEncode(digest)
    )

    const url =
      blobAllocate.out.ok.address?.url &&
      new URL(blobAllocate.out.ok.address?.url)
    if (!url) {
      throw new Error('Expected presigned url in response')
    }
    const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders')

    assert.equal(
      signedHeaders,
      'content-length;host;x-amz-checksum-sha256',
      'content-length and checksum must be part of the signature'
    )

    // Validate allocation state
    const spaceAllocations = await context.allocationsStorage.list(spaceDid)
    assert.ok(spaceAllocations.ok)
    assert.equal(spaceAllocations.ok?.size, 1)
    const allocatedEntry = spaceAllocations.ok?.results[0]
    if (!allocatedEntry) {
      throw new Error('Expected presigned allocatedEntry in response')
    }
    assert.ok(equals(allocatedEntry.blob.content, content))
    assert.equal(allocatedEntry.blob.size, size)

    // Validate presigned url usage
    const goodPut = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      body: data,
      headers: blobAllocate.out.ok.address?.headers,
    })

    assert.equal(goodPut.status, 200, await goodPut.text())
  },
  'blob/allocate does not allocate more space to already allocated content':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)
      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocation
      const blobAddInvocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `service/blob/allocate`
      const serviceBlobAllocate = BlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
          cause: (await blobAddInvocation.delegate()).cid,
          space: spaceDid,
        },
        proofs: [proof],
      })
      const blobAllocate = await serviceBlobAllocate.execute(connection)
      if (!blobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: blobAllocate })
      }

      // second blob allocate invocation
      const secondBlobAllocate = await serviceBlobAllocate.execute(connection)
      if (!secondBlobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: secondBlobAllocate })
      }

      // Validate response
      assert.equal(secondBlobAllocate.out.ok.size, 0)
      assert.ok(!!blobAllocate.out.ok.address)
    },
  'blob/allocate can allocate to different space after write to one space':
    async (assert, context) => {
      const { proof: aliceProof, spaceDid: aliceSpaceDid } =
        await registerSpace(alice, context)
      const { proof: bobProof, spaceDid: bobSpaceDid } = await registerSpace(
        bob,
        context,
        'bob'
      )

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocations
      const aliceBlobAddInvocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: aliceSpaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [aliceProof],
      })
      const bobBlobAddInvocation = BlobCapabilities.add.invoke({
        issuer: bob,
        audience: context.id,
        with: bobSpaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [bobProof],
      })

      // invoke `service/blob/allocate` capabilities on alice space
      const aliceServiceBlobAllocate = BlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: aliceSpaceDid,
        nb: {
          blob: {
            content,
            size,
          },
          cause: (await aliceBlobAddInvocation.delegate()).cid,
          space: aliceSpaceDid,
        },
        proofs: [aliceProof],
      })
      const aliceBlobAllocate = await aliceServiceBlobAllocate.execute(
        connection
      )
      if (!aliceBlobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: aliceBlobAllocate })
      }
      // there is address to write
      assert.ok(aliceBlobAllocate.out.ok.address)
      assert.equal(aliceBlobAllocate.out.ok.size, size)

      // write to presigned url
      const url =
        aliceBlobAllocate.out.ok.address?.url &&
        new URL(aliceBlobAllocate.out.ok.address?.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }
      const goodPut = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: aliceBlobAllocate.out.ok.address?.headers,
      })

      assert.equal(goodPut.status, 200, await goodPut.text())

      // invoke `service/blob/allocate` capabilities on bob space
      const bobServiceBlobAllocate = BlobCapabilities.allocate.invoke({
        issuer: bob,
        audience: context.id,
        with: bobSpaceDid,
        nb: {
          blob: {
            content,
            size,
          },
          cause: (await bobBlobAddInvocation.delegate()).cid,
          space: bobSpaceDid,
        },
        proofs: [bobProof],
      })
      const bobBlobAllocate = await bobServiceBlobAllocate.execute(connection)
      if (!bobBlobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: bobBlobAllocate })
      }
      // there is no address to write
      assert.ok(!bobBlobAllocate.out.ok.address)
      assert.equal(bobBlobAllocate.out.ok.size, size)

      // Validate allocation state
      const aliceSpaceAllocations = await context.allocationsStorage.list(
        aliceSpaceDid
      )
      assert.ok(aliceSpaceAllocations.ok)
      assert.equal(aliceSpaceAllocations.ok?.size, 1)

      const bobSpaceAllocations = await context.allocationsStorage.list(
        bobSpaceDid
      )
      assert.ok(bobSpaceAllocations.ok)
      assert.equal(bobSpaceAllocations.ok?.size, 1)
    },
  'blob/allocate creates presigned url that can only PUT a payload with right length':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const longer = new Uint8Array([11, 22, 34, 44, 55, 66])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocation
      const blobAddInvocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `service/blob/allocate`
      const serviceBlobAllocate = BlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
          cause: (await blobAddInvocation.delegate()).cid,
          space: spaceDid,
        },
        proofs: [proof],
      })
      const blobAllocate = await serviceBlobAllocate.execute(connection)
      if (!blobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: blobAllocate })
      }
      // there is address to write
      assert.ok(blobAllocate.out.ok.address)
      assert.equal(blobAllocate.out.ok.size, size)

      // write to presigned url
      const url =
        blobAllocate.out.ok.address?.url &&
        new URL(blobAllocate.out.ok.address?.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }
      const contentLengthFailSignature = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: longer,
        headers: {
          ...blobAllocate.out.ok.address?.headers,
          'content-length': longer.byteLength.toString(10),
        },
      })

      assert.equal(
        contentLengthFailSignature.status >= 400,
        true,
        'should fail to upload as content-length differs from that used to sign the url'
      )
    },
  'blob/allocate creates presigned url that can only PUT a payload with exact bytes':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const other = new Uint8Array([10, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocation
      const blobAddInvocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `service/blob/allocate`
      const serviceBlobAllocate = BlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
          cause: (await blobAddInvocation.delegate()).cid,
          space: spaceDid,
        },
        proofs: [proof],
      })
      const blobAllocate = await serviceBlobAllocate.execute(connection)
      if (!blobAllocate.out.ok) {
        throw new Error('invocation failed', { cause: blobAllocate })
      }
      // there is address to write
      assert.ok(blobAllocate.out.ok.address)
      assert.equal(blobAllocate.out.ok.size, size)

      // write to presigned url
      const url =
        blobAllocate.out.ok.address?.url &&
        new URL(blobAllocate.out.ok.address?.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }
      const failChecksum = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: other,
        headers: blobAllocate.out.ok.address?.headers,
      })

      assert.equal(
        failChecksum.status,
        400,
        'should fail to upload any other data.'
      )
    },
  'blob/allocate disallowed if invocation fails access verification': async (
    assert,
    context
  ) => {
    const { proof, space, spaceDid } = await createSpace(alice)

    // prepare data
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const content = multihash.bytes
    const size = data.byteLength

    // create service connection
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // create `blob/add` invocation
    const blobAddInvocation = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          content,
          size,
        },
      },
      proofs: [proof],
    })

    // invoke `service/blob/allocate`
    const serviceBlobAllocate = BlobCapabilities.allocate.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          content,
          size,
        },
        cause: (await blobAddInvocation.delegate()).cid,
        space: spaceDid,
      },
      proofs: [proof],
    })
    const blobAllocate = await serviceBlobAllocate.execute(connection)
    assert.ok(blobAllocate.out.error)
    assert.equal(blobAllocate.out.error?.message.includes('no storage'), true)

    // Register space and retry
    const account = Absentee.from({ id: 'did:mailto:test.web3.storage:alice' })
    const providerAdd = await provisionProvider({
      service: /** @type {API.Signer<API.DID<'web'>>} */ (context.signer),
      agent: alice,
      space,
      account,
      connection,
    })
    assert.ok(providerAdd.out.ok)

    const retryBlobAllocate = await serviceBlobAllocate.execute(connection)
    assert.equal(retryBlobAllocate.out.error, undefined)
  },
  'blob/accept is executed once ucan/conclude is invoked with the blob put receipt and blob was sent':
    async (assert, context) => {
      const taskScheduled = pDefer()
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const content = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer({
          ...context,
          tasksScheduler: {
            schedule: (invocation) => {
              taskScheduled.resolve(invocation)

              return Promise.resolve({
                ok: {},
              })
            }
          },
        }),
      })

      // invoke `blob/add`
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            content,
            size,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await invocation.execute(connection)
      if (!blobAdd.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      // Get receipt relevant content
      /**
       * @type {import('@ucanto/interface').Invocation[]}
       **/
      // @ts-expect-error read only effect
      const forkInvocations = blobAdd.fx.fork
      const allocateUcanConcludefx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === UCAN.conclude.can
      )
      const putfx = forkInvocations.find(
        (fork) => fork.capabilities[0].can === BlobCapabilities.put.can
      )
      if (!allocateUcanConcludefx || !putfx) {
        throw new Error('effects not provided')
      }
      const blobAllocateMessageCar = CAR.codec.decode(
        // @ts-expect-error object of type unknown
        allocateUcanConcludefx.capabilities[0].nb.bytes
      )
      const blobAllocateMessage = Message.view({
        root: blobAllocateMessageCar.roots[0].cid,
        store: blobAllocateMessageCar.blocks,
      })
      const receiptKey = Array.from(blobAllocateMessage.receipts.keys())[0]
      const receipt = blobAllocateMessage.receipts.get(receiptKey)

      // Get `blob/allocate` receipt with address
      /**
       * @type {import('@web3-storage/capabilities/types').BlobAddress}
       **/
      // @ts-expect-error receipt out is unknown
      const address = receipt?.out.ok?.address
      assert.ok(address)

      // Write blob
      const goodPut = await fetch(address.url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: address?.headers,
      })
      assert.equal(goodPut.status, 200, await goodPut.text())

      // Create `http/put` receipt
      /** @type {{ bytes: Uint8Array, did: string }} */
      // @ts-expect-error facts are unknown
      const [{ bytes, did }] = putfx.facts
      const putSubject = ed25519.decode(bytes)
      const httpPut = BlobCapabilities.put.invoke({
        issuer: putSubject,
        audience: putSubject,
        with: putSubject.toDIDKey(),
        nb: {
          blob: {
            content,
            size,
          },
          address
        },
        facts: putfx.facts,
        expiration: Infinity,
      })

      const httpPutDelegation = await httpPut.delegate()
      const httpPutReceipt = await Receipt.issue({
        issuer: putSubject,
        ran: httpPutDelegation.cid,
        result: {
          ok: {},
        },
      })
      const message = await Message.build({ receipts: [httpPutReceipt] })
      const messageCar = await CAR.outbound.encode(message)

      // Invoke `ucan/conclude` with `http/put` receipt
      const httpPutConcludeInvocation = UCAN.conclude.invoke({
        issuer: alice,
        audience: context.id,
        with: alice.did(),
        nb: {
          bytes: messageCar.body,
        },
        expiration: Infinity,
      })
      const ucanConclude = await httpPutConcludeInvocation.execute(connection)
      if (!ucanConclude.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      // verify accept was scheduled
      const blobAcceptInvocation = await taskScheduled.promise
      assert.ok(blobAcceptInvocation)
      assert.ok(
        blobAdd.out.ok.claim['await/ok'].equals(blobAcceptInvocation.cid)
      )
      assert.ok(blobAdd.fx.join?.link().equals(blobAcceptInvocation.cid))
    },
  // TODO: Blob accept
  // TODO: list
  // TODO: remove
}
