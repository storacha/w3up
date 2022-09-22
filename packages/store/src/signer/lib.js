import * as API from '@ucanto/interface'
import Signer, { Types } from '@web3-storage/sigv4'
import { base64pad } from 'multiformats/bases/base64'

/**
 * @param {API.Link<unknown, number, number, 0 | 1>} link
 * @param {Types.SigV4Options & Types.SignOptions} options
 * @return {{url:URL, headers:Record<string, string>}}
 */
export const sign = (link, { bucket, expires = 1000, ...options }) => {
  const signer = new Signer({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
  })

  const checksum = base64pad.baseEncode(link.multihash.digest)
  const url = signer.sign({
    key: `${link}/${link}.car`,
    checksum: checksum,
    bucket,
    expires,
    sessionToken: options.sessionToken,
    publicRead: true,
  })

  return {
    url,
    headers: {
      'x-amz-checksum-sha256': checksum,
    },
  }
}
