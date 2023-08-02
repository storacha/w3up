import * as DID from '@ipld/dag-ucan/did'

/**
 * @typedef {import('./types').SERVICE} Service
 * @typedef {import('./types').ServiceConfig} ServiceConfig
 */

/**
 * @type {Record<Service, ServiceConfig>}
 */
export const services = {
  STORE_FRONT: {
    url: new URL('https://up.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
  AGGREGATOR: {
    url: new URL('https://aggregator.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
  BROKER: {
    url: new URL('https://spade-proxy.web3.storage'),
    principal: DID.parse('did:web:spade.web3.storage'),
  },
  CHAIN: {
    url: new URL('https://spade-proxy.web3.storage'),
    principal: DID.parse('did:web:spade.web3.storage'),
  },
}
