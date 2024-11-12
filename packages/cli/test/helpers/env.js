/**
 * @param {object} [options]
 * @param {import('@ucanto/interface').Principal} [options.servicePrincipal]
 * @param {URL} [options.serviceURL]
 * @param {string} [options.storeName]
 * @param {URL} [options.receiptsEndpoint]
 */
export function createEnv(options = {}) {
  const { servicePrincipal, serviceURL, storeName, receiptsEndpoint } = options
  const env = { STORACHA_STORE_NAME: storeName ?? 'storacha-test' }
  if (servicePrincipal && serviceURL) {
    Object.assign(env, {
      STORACHA_SERVICE_DID: servicePrincipal.did(),
      STORACHA_SERVICE_URL: serviceURL.toString(),
      STORACHA_RECEIPTS_URL: receiptsEndpoint?.toString(),
    })
  }
  return env
}
