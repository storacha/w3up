import * as API from '../../src/types.js'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Result from '../helpers/result.js'
import { equals } from 'multiformats/bytes'

/**
 * @type {API.Tests}
 */
export const test = {
  'should create valid presigned URL for blobs that can be used to write':
    async (assert, context) => {
      const blobsStorage = context.blobsStorage
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash0 = await sha256.digest(data)
      const digest = multihash0.bytes
      const size = data.byteLength
      const expiresIn = 60 * 60 * 24 // 1 day
      const blob = {
        digest: digest,
        size: size,
      }
      const createUploadUrl = await blobsStorage.createUploadUrl(
        multihash0,
        blob.size,
        expiresIn
      )
      if (!createUploadUrl.ok) {
        throw new Error('should create presigned url')
      }

      assert.ok(createUploadUrl.ok.headers['content-length'])
      assert.ok(createUploadUrl.ok.headers['x-amz-checksum-sha256'])

      // Store the blob to the address
      const goodPut = await fetch(createUploadUrl.ok.url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: createUploadUrl.ok.headers,
      })
      assert.equal(goodPut.status, 200, await goodPut.text())

      // check it exists
      const hasBlob = await blobsStorage.has(multihash0)
      assert.ok(hasBlob.ok)
    },

  'should create valid download URL for blobs that can be used to read': async (
    assert,
    { blobsStorage }
  ) => {
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const digest = await sha256.digest(data)
    const expires = 60 * 60 * 24 // 1 day

    const upload = Result.unwrap(
      await blobsStorage.createUploadUrl(digest, data.length, expires)
    )

    await fetch(upload.url, {
      method: 'PUT',
      mode: 'cors',
      body: data,
      headers: upload.headers,
    })

    const downloadUrl = Result.unwrap(
      await blobsStorage.createDownloadUrl(digest)
    )

    const res = await fetch(downloadUrl)
    assert.ok(equals(new Uint8Array(await res.arrayBuffer()), data))
  },
}
