import { provide } from '@ucanto/server'
import { conclude } from '@web3-storage/capabilities/ucan'
import * as API from '../types.js'

/**
 * @param {API.ConcludeServiceContext} context
 * @returns {API.ServiceMethod<API.UCANConclude, API.UCANConcludeSuccess, API.UCANConcludeFailure>}
 */
export const ucanConcludeProvider = ({ receiptsStorage }) =>
  provide(conclude, async ({ capability, invocation }) => {
    // TODO: Store receipt

    // TODO: Schedule accept (temporary simple hack)

    return {
      ok: { time: Date.now() },
    }
  })
