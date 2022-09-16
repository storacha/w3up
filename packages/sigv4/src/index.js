import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import { hmac } from '@noble/hashes/hmac'

export class SigV4 {
  /**
   * @param {import('./types').SigV4Options} options
   */
  constructor({ accessKeyId, secretAccessKey, region, cache, sessionToken }) {
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    /** @type {string} */
    this.service = 's3'
    this.region = region
    this.cache = cache || new Map()
    this.datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    this.headersNames = ['host']
    this.credentialString = [
      this.datetime.slice(0, 8),
      this.region,
      this.service,
      'aws4_request',
    ].join('/')
    this.sessionToken = sessionToken
  }

  /**
   * @param {import('./types').SignOptions} options
   */
  sign({ bucket, key, checksum, expires }) {
    this.url = new URL(
      `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`
    )

    this.canonicalHeaders = [`host:${this.url.host}`]

    // add checksum headers
    if (checksum) {
      this.headersNames.push('x-amz-checksum-sha256')
      this.canonicalHeaders.push(`x-amz-checksum-sha256:${checksum}`)
    }
    this.signedHeaders = this.headersNames.join(';')

    this.encodedPath = encodeURIComponent(this.url.pathname).replace(
      /%2F/g,
      '/'
    )

    // Set query string
    const params = this.url.searchParams
    params.set('X-Amz-Date', this.datetime)
    params.set('X-Amz-Expires', expires ? `${expires}` : '86400') // 24 hours
    params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
    params.set(
      'X-Amz-Credential',
      this.accessKeyId + '/' + this.credentialString
    )
    params.set('X-Amz-SignedHeaders', this.signedHeaders)
    if (this.sessionToken) {
      params.set('X-Amz-Security-Token', this.sessionToken)
    }

    // Encode query string to be signed
    const seenKeys = new Set()
    this.encodedSearch = [...this.url.searchParams]
      .filter(([k]) => {
        if (!k) return false // no empty keys
        if (seenKeys.has(k)) return false // first val only for S3
        seenKeys.add(k)
        return true
      })
      .map((pair) => pair.map((p) => encodeURIComponent(p)))
      .sort(([k1, v1], [k2, v2]) =>
        // eslint-disable-next-line no-nested-ternary
        k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0
      )
      .map((pair) => pair.join('='))
      .join('&')

    params.set('X-Amz-Signature', this.signature())

    return this.url
  }

  /**
   * @returns {string}
   */
  signature() {
    const date = this.datetime.slice(0, 8)
    const cacheKey = [
      this.secretAccessKey,
      date,
      this.region,
      this.service,
    ].join('')

    let kCredentials = this.cache.get(cacheKey)

    if (!kCredentials) {
      const kDate = hmac(sha256, 'AWS4' + this.secretAccessKey, date)
      const kRegion = hmac(sha256, kDate, this.region)
      const kService = hmac(sha256, kRegion, this.service)
      kCredentials = hmac(sha256, kService, 'aws4_request')
      this.cache.set(cacheKey, kCredentials)
    }

    return toHex(hmac(sha256, kCredentials, this.stringToSign()))
  }

  /**
   * @returns {string}
   */
  stringToSign() {
    return [
      'AWS4-HMAC-SHA256',
      this.datetime,
      this.credentialString,
      toHex(sha256(this.canonicalString())),
    ].join('\n')
  }

  /**
   * @returns {string}
   */
  canonicalString() {
    return [
      'PUT',
      this.encodedPath,
      this.encodedSearch,
      this.canonicalHeaders?.join('\n') + '\n',
      this.signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')
  }
}
