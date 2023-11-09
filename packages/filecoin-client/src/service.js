import * as DID from '@ipld/dag-ucan/did'

/**
 * @typedef {import('./types.js').SERVICE} Service
 * @typedef {import('./types.js').ServiceConfig} ServiceConfig
 */

/**
 * @type {Record<Service, ServiceConfig>}
 */
export const services = {
  STOREFRONT: {
    url: new URL('https://up.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
  AGGREGATOR: {
    url: new URL('https://aggregator.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
  DEALER: {
    url: new URL('https://dealer.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
  DEAL_TRACKER: {
    url: new URL('https://tracker.web3.storage'),
    principal: DID.parse('did:web:web3.storage'),
  },
}
