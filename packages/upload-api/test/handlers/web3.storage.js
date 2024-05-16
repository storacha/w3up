import * as API from '../../src/types.js'
import { equals } from 'uint8arrays'
import { create as createLink } from 'multiformats/link'
import { Absentee } from '@ucanto/principal'
import { Digest } from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { code as rawCode } from 'multiformats/codecs/raw'
import { Assert } from '@web3-storage/content-claims/capability'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import { base64pad } from 'multiformats/bases/base64'

import { AllocatedMemoryHadNotBeenWrittenToName } from '../../src/blob/lib.js'
import { provisionProvider } from '../helpers/utils.js'
import { createServer, connect } from '../../src/lib.js'
import { alice, bob, createSpace, registerSpace } from '../util.js'
import { parseBlobAddReceiptNext } from '../helpers/blob.js'
import * as Result from '../helpers/result.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'web3.storage/blob/allocate allocates to space and returns presigned url':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `web3.storage/blob/allocate`
      const serviceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
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
      assert.ok(blobAllocate.out.ok.address?.expiresAt)
      assert.equal(
        blobAllocate.out.ok.address?.headers?.['content-length'],
        String(size)
      )
      assert.deepEqual(
        blobAllocate.out.ok.address?.headers?.['x-amz-checksum-sha256'],
        base64pad.baseEncode(multihash.digest)
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
      assert.ok(equals(allocatedEntry.blob.digest, digest))
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
  'web3.storage/blob/allocate does not allocate more space to already allocated content':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)
      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `web3.storage/blob/allocate`
      const serviceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
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
  'web3.storage/blob/allocate can allocate to different space after write to one space':
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
      const digest = multihash.bytes
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
            digest,
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
            digest,
            size,
          },
        },
        proofs: [bobProof],
      })

      // invoke `web3.storage/blob/allocate` capabilities on alice space
      const aliceServiceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: aliceSpaceDid,
        nb: {
          blob: {
            digest,
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

      // invoke `web3.storage/blob/allocate` capabilities on bob space
      const bobServiceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: bob,
        audience: context.id,
        with: bobSpaceDid,
        nb: {
          blob: {
            digest,
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
  'web3.storage/blob/allocate creates presigned url that can only PUT a payload with right length':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const longer = new Uint8Array([11, 22, 34, 44, 55, 66])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `web3.storage/blob/allocate`
      const serviceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
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
  'web3.storage/blob/allocate creates presigned url that can only PUT a payload with exact bytes':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const other = new Uint8Array([10, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `web3.storage/blob/allocate`
      const serviceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
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
  'web3.storage/blob/allocate disallowed if invocation fails access verification':
    async (assert, context) => {
      const { proof, space, spaceDid } = await createSpace(alice)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })

      // invoke `web3.storage/blob/allocate`
      const serviceBlobAllocate = W3sBlobCapabilities.allocate.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
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
      const account = Absentee.from({
        id: 'did:mailto:test.web3.storage:alice',
      })
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
  'web3.storage/blob/accept returns site delegation': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)

    // prepare data
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength
    const content = createLink(
      rawCode,
      new Digest(sha256.code, 32, digest, digest)
    )

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
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    const blobAdd = await blobAddInvocation.execute(connection)
    if (!blobAdd.out.ok) {
      throw new Error('invocation failed', { cause: blobAdd })
    }

    // parse receipt next
    const next = parseBlobAddReceiptNext(blobAdd)

    /** @type {import('@web3-storage/capabilities/types').BlobAddress} */
    // @ts-expect-error receipt type is unknown
    const address = next.allocate.receipt.out.ok.address

    // Store the blob to the address
    const goodPut = await fetch(address.url, {
      method: 'PUT',
      mode: 'cors',
      body: data,
      headers: address.headers,
    })
    assert.equal(goodPut.status, 200, await goodPut.text())

    // invoke `web3.storage/blob/accept`
    const serviceBlobAccept = W3sBlobCapabilities.accept.invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        blob: {
          digest,
          size,
        },
        space: spaceDid,
        _put: { 'ucan/await': ['.out.ok', next.put.task.link()] },
      },
      proofs: [proof],
    })
    const blobAccept = await serviceBlobAccept.execute(connection)
    if (!blobAccept.out.ok) {
      throw new Error('invocation failed', { cause: blobAccept })
    }
    // Validate out
    assert.ok(blobAccept.out.ok)
    assert.ok(blobAccept.out.ok.site)

    // Validate effect
    assert.equal(blobAccept.fx.fork.length, 1)
    /** @type {import('@ucanto/interface').Delegation} */
    // @ts-expect-error delegation not assignable to Effect per TS understanding
    const delegation = blobAccept.fx.fork[0]
    assert.equal(delegation.capabilities.length, 1)
    assert.ok(delegation.capabilities[0].can, Assert.location.can)
    // @ts-expect-error nb unknown
    assert.ok(delegation.capabilities[0].nb.content.equals(content))
    // @ts-expect-error nb unknown
    const locations = delegation.capabilities[0].nb.location
    assert.equal(locations.length, 1)

    const loc = Result.unwrap(await context.blobsStorage.createDownloadUrl(digest))
    assert.ok(locations.includes(loc))
  },
  'web3.storage/blob/accept fails to provide site delegation when blob was not stored':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
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
            digest,
            size,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await blobAddInvocation.execute(connection)
      if (!blobAdd.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      // parse receipt next
      const next = parseBlobAddReceiptNext(blobAdd)

      // invoke `web3.storage/blob/accept`
      const serviceBlobAccept = W3sBlobCapabilities.accept.invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          blob: {
            digest,
            size,
          },
          space: spaceDid,
          _put: { 'ucan/await': ['.out.ok', next.put.task.link()] },
        },
        proofs: [proof],
      })
      const blobAccept = await serviceBlobAccept.execute(connection)
      // Validate out error
      assert.ok(blobAccept.out.error)
      assert.equal(
        blobAccept.out.error?.name,
        AllocatedMemoryHadNotBeenWrittenToName
      )
    },
}
