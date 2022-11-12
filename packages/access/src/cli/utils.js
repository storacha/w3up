import undici from 'undici'
import { Verifier } from '@ucanto/principal/ed25519'

/** @type {Record<string,string>} */
const envs = {
  production: 'https://access-api.web3.storage',
  staging: 'https://w3access-staging.protocol-labs.workers.dev',
  dev: 'https://w3access-dev.protocol-labs.workers.dev',
  local: 'http://127.0.0.1:8787',
}

/**
 * @type {import("@ucanto/interface").Principal}
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
    const rsp = await undici.fetch(url + 'version')

    // @ts-ignore
    const { did } = await rsp.json()
    audience = Verifier.parse(did)
    return { url, audience }
  }
}
