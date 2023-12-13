import ipfsUtilsFetch from 'ipfs-utils/src/http/fetch.js'

/**
 * @type {import('./types.js').FetchWithUploadProgress}
 */
export const fetchWithUploadProgress = (url, init) => {
  return ipfsUtilsFetch.fetch(url, init)
}
