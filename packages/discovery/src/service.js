import noop from './noop.js'
import claim from './claim.js'
import { createMethod } from './ucanto-utils.js'

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
        location: createMethod('discovery/assert/location', noop),
        inclusion: createMethod('discovery/assert/inclusion', noop),
        partition: createMethod('discovery/assert/partition', noop),
      },
      claim: createMethod('discovery/claim', claim),
    },
  }
}
