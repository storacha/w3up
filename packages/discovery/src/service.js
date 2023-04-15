import location from './location.js'

export default { create }

/**
 * create a discovery service
 * 
 * @returns {import('./types.js').ContentDiscoveryService} - content discovery service that can be served with ucanto
 */
export function create() {
  return {
    discovery: {
      assert: {
        location: location.method({ can: 'discovery/assert/location' }),
      }
    },
  }
}
