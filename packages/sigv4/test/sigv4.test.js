import { assert } from 'chai'
import { sha256 } from '@noble/hashes/sha256'
import { SigV4 } from '../src/index.js'
import fetch from '@web-std/fetch'
import delay from 'delay'

const LOOKUP =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

/**
 * @param {ArrayBuffer} buffer
 */
export function encodeBase64(buffer) {
  const view = new Uint8Array(buffer)
  const out = []
  for (let i = 0; i < view.length; i += 3) {
    // eslint-disable-next-line unicorn/numeric-separators-style
    const [b1, b2 = 0x10000, b3 = 0x10000] = view.subarray(i, i + 3)
    out.push(
      b1 >> 2,
      ((b1 << 4) | (b2 >> 4)) & 63,
      b2 <= 0xff ? ((b2 << 2) | (b3 >> 6)) & 63 : 64,
      b3 <= 0xff ? b3 & 63 : 64
    )
  }
  return out.map((c) => LOOKUP[c]).join('')
}

describe('Signer', function () {
  describe('#sign()', function () {
    it('should sign', function () {
      const signer = new SigV4({
        accessKeyId: 'id',
        region: 'eu-central-1',
        secretAccessKey: 'secret',
      })

      const url = signer.sign({
        bucket: 'bucket-name',
        key: 'name',
      })

      assert.equal(url.host, 'bucket-name.s3.eu-central-1.amazonaws.com')
      assert.equal(url.pathname, '/name')
      const search = url.searchParams
      assert.equal(search.get('X-Amz-Expires'), '86400')
      assert.equal(search.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256')
      assert.match(search.get('X-Amz-Credential') || '', /aws4_request/)
      assert.equal(search.get('X-Amz-SignedHeaders'), 'host')
      assert.ok(typeof search.get('X-Amz-Signature') === 'string')
    })

    it('should sign with checksum', function () {
      const signer = new SigV4({
        accessKeyId: 'id',
        region: 'eu-central-1',
        secretAccessKey: 'secret',
      })

      const url = signer.sign({
        bucket: 'bucket-name',
        key: 'name',
        checksum: 'sss',
      })

      const search = url.searchParams
      assert.equal(
        search.get('X-Amz-SignedHeaders'),
        'host;x-amz-checksum-sha256'
      )
    })

    it('should sign with expires', function () {
      const signer = new SigV4({
        accessKeyId: 'id',
        region: 'eu-central-1',
        secretAccessKey: 'secret',
      })

      const url = signer.sign({
        bucket: 'bucket-name',
        key: 'name',
        checksum: 'sss',
        expires: 1000,
      })

      const search = url.searchParams
      assert.equal(search.get('X-Amz-Expires'), '1000')
    })
  })

  describe.skip('s3 integration needs .env and cors setup', function () {
    it('should sign and upload', async function () {
      const data = { key: 'value' }

      const hash = encodeBase64(sha256(JSON.stringify(data)))

      const signer = new SigV4({
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        region: 'eu-central-1',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      })

      const url = signer.sign({
        bucket: process.env.S3_BUCKET || '',
        key: `testing/test-file-${Date.now()}.json`,
        checksum: hash,
        expires: 1000,
      })

      const rsp = await fetch(url.toString(), {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'x-amz-checksum-sha256': hash,
        },
      })

      assert.ok(rsp.ok)
    })

    it('should sign and fail upload because hash fails', async function () {
      const data = { key: 'value' }

      const hash = encodeBase64(sha256(JSON.stringify(data)))

      const signer = new SigV4({
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        region: 'eu-central-1',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      })

      const url = signer.sign({
        bucket: process.env.S3_BUCKET || '',
        key: `testing/test-file-${Date.now()}.json`,
        checksum: hash,
        expires: 1000,
      })

      const rsp = await fetch(url.toString(), {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'x-amz-checksum-sha256': hash + 'ss',
        },
      })
      const out = await rsp.text()
      assert.ok(out.includes('SignatureDoesNotMatch'))
    })

    it('should sign and fail upload because expired', async function () {
      const data = { key: 'value' }

      const hash = encodeBase64(sha256(JSON.stringify(data)))

      const signer = new SigV4({
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        region: 'eu-central-1',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      })

      const url = signer.sign({
        bucket: process.env.S3_BUCKET || '',
        key: `testing/test-file-${Date.now()}.json`,
        checksum: hash,
        expires: 1,
      })

      await delay(500)
      const rsp = await fetch(url.toString(), {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'x-amz-checksum-sha256': hash,
        },
      })
      const out = await rsp.text()
      assert.ok(out.includes('Request has expired'))
    })
  })
})
