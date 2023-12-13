import ipfsUtilsFetch from 'ipfs-utils/src/http/fetch.js'

/**
 * @type {import('./types.js').FetchWithUploadProgress}
 */
export const fetchWithUploadProgress = (url, init) => {
  if (init && 'readable' in init) {
    throw new Error('init cannot be readable')
  }
  return ipfsUtilsFetch.fetch(url, init)
}
