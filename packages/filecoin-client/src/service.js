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
    url: new URL('https://up.storacha.network'),
    principal: DID.parse('did:web:storacha.network'),
  },
  AGGREGATOR: {
    url: new URL('https://aggregator.storacha.network'),
    principal: DID.parse('did:web:storacha.network'),
  },
  DEALER: {
    url: new URL('https://dealer.storacha.network'),
    principal: DID.parse('did:web:storacha.network'),
  },
  DEAL_TRACKER: {
    url: new URL('https://tracker.storacha.network'),
    principal: DID.parse('did:web:storacha.network'),
  },
}
