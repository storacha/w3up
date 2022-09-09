import * as DID from '@ipld/dag-ucan/did'
import undici from 'undici'

/** @type {Record<string,string>} */
const envs = {
  production: 'https://access-api-staging.web3.storage',
  staging: 'https://access-api.web3.storage',
  dev: 'https://w3access-dev.protocol-labs.workers.dev',
  local: 'http://127.0.0.1:8787',
}

/**
 * @type {import("@ipld/dag-ucan").DIDView}
 */
let audience

/**
 * @param {string} env
 */
export async function getService(env) {
  const url = new URL(envs[env])
  if (audience) {
    return { url, did: audience }
  } else {
    const rsp = await undici.fetch(url + '/version')

    // @ts-ignore
    const { did } = await rsp.json()
    audience = DID.parse(did)
    return { url, audience }
  }
}
