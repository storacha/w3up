import { base64pad } from 'multiformats/bases/base64'
import { SigV4 } from '@web3-storage/sigv4'
import * as API from './type.js'

/**
 * @param {API.Link<unknown, number, number, 0 | 1>} link
 * @param {API.SignOptions} options
 * @return {{url:URL, headers:Record<string, string>}}
 */
export const sign = (link, { bucket, expires = 1000, ...options }) => {
  // sigv4
  const sig = new SigV4({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
    sessionToken: options.sessionToken,
  })

  const checksum = base64pad.baseEncode(link.multihash.digest)
  const url = sig.sign({
    key: `${link}/${link}.car`,
    checksum: checksum,
    bucket,
    expires,
  })

  return {
    url,
    headers: {
      'x-amz-checksum-sha256': checksum,
    },
  }
}
