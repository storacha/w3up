import { provider as location } from './location.js'
export default { create }

// eslint-disable-next-line jsdoc/require-returns
/**
 * create a discovery service
 */
export function create() {
  return {
    discovery: {
      assert: {
        location,
      },
    },
  }
}
