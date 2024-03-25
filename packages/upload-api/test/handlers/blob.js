import * as API from '../../src/types.js'
import { Absentee } from '@ucanto/principal'
import { equals } from 'uint8arrays'
import { sha256 } from 'multiformats/hashes/sha2'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import { base64pad } from 'multiformats/bases/base64'

import { provisionProvider } from '../helpers/utils.js'
import { createServer, connect } from '../../src/lib.js'
import { alice, bob, createSpace, registerSpace } from '../util.js'
import { BlobItemSizeExceededName } from '../../src/blob/lib.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'blob/add schedules allocation and returns effects for allocation and accept': async (assert, context) => {
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
          size
        },
      },
      proofs: [proof],
    })
    const blobAdd = await invocation.execute(connection)
    if (!blobAdd.out.ok) {
      console.log('out error')
      throw new Error('invocation failed', { cause: blobAdd })
    }

    assert.ok(blobAdd.out.ok.claim)
    assert.ok(blobAdd.fx.fork.length)
    assert.ok(blobAdd.fx.join)
    assert.ok(blobAdd.out.ok.claim['await/ok'].equals(blobAdd.fx.join))

    // validate scheduled task ran
    // await deferredSchedule.promise
    // assert.equal(scheduledTasks.length, 1)
    // const [blobAllocateInvocation] = scheduledTasks
    // assert.equal(blobAllocateInvocation.can, BlobCapabilities.allocate.can)
    // assert.equal(blobAllocateInvocation.nb.space, spaceDid)
    // assert.equal(blobAllocateInvocation.nb.blob.size, size)
    // assert.ok(equals(blobAllocateInvocation.nb.blob.content, content))
  },
  'blob/add fails when a blob with size bigger than maximum size is added': async (assert, context) => {
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
          size: Number.MAX_SAFE_INTEGER
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
  'skip blob/add fails when allocate task cannot be scheduled': async (assert, context) => {
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
          size
        },
      },
      proofs: [proof],
    })
    const blobAdd = await invocation.execute(connection)
    if (!blobAdd.out.error) {
      throw new Error('invocation should have failed')
    }
    assert.ok(blobAdd.out.error, 'invocation should have failed')
    assert.ok(blobAdd.out.error.message.includes(BlobCapabilities.allocate.can))
    assert.equal(blobAdd.out.error.name, 'Error')
  },
  'blob/allocate allocates to space and returns presigned url': async (assert, context) => {
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
          size
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
          size
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
    assert.equal(blobAllocate.out.ok.address?.headers?.['content-length'], String(size))
    assert.deepEqual(
      blobAllocate.out.ok.address?.headers?.['x-amz-checksum-sha256'],
      base64pad.baseEncode(digest)
    )

    const url = blobAllocate.out.ok.address?.url && new URL(blobAllocate.out.ok.address?.url)
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
    const spaceAllocations = await context.allocationStorage.list(spaceDid)
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
  'blob/allocate does not allocate more space to already allocated content': async (assert, context) => {
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
          size
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
          size
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
  'blob/allocate can allocate to different space after write to one space': async (assert, context) => {
    const { proof: aliceProof, spaceDid: aliceSpaceDid } = await registerSpace(alice, context)
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
          size
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
          size
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
          size
        },
        cause: (await aliceBlobAddInvocation.delegate()).cid,
        space: aliceSpaceDid,
      },
      proofs: [aliceProof],
    })
    const aliceBlobAllocate = await aliceServiceBlobAllocate.execute(connection)
    if (!aliceBlobAllocate.out.ok) {
      throw new Error('invocation failed', { cause: aliceBlobAllocate })
    }
    // there is address to write
    assert.ok(aliceBlobAllocate.out.ok.address)
    assert.equal(aliceBlobAllocate.out.ok.size, size)

    // write to presigned url
    const url = aliceBlobAllocate.out.ok.address?.url && new URL(aliceBlobAllocate.out.ok.address?.url)
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
          size
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
    const aliceSpaceAllocations = await context.allocationStorage.list(aliceSpaceDid)
    assert.ok(aliceSpaceAllocations.ok)
    assert.equal(aliceSpaceAllocations.ok?.size, 1)

    const bobSpaceAllocations = await context.allocationStorage.list(bobSpaceDid)
    assert.ok(bobSpaceAllocations.ok)
    assert.equal(bobSpaceAllocations.ok?.size, 1)
  },
  'blob/allocate creates presigned url that can only PUT a payload with right length': async (assert, context) => {
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
          size
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
          size
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
    const url = blobAllocate.out.ok.address?.url && new URL(blobAllocate.out.ok.address?.url)
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
  'blob/allocate creates presigned url that can only PUT a payload with exact bytes': async (assert, context) => {
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
          size
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
          size
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
    const url = blobAllocate.out.ok.address?.url && new URL(blobAllocate.out.ok.address?.url)
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
  'blob/allocate disallowed if invocation fails access verification': async (assert, context) => {
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
          size
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
          size
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
  // TODO: Blob accept
  // TODO: list
  // TODO: remove
}
