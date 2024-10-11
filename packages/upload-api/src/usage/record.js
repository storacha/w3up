import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Usage } from '@web3-storage/capabilities'

/** @param {API.UsageServiceContext} context */
export const provide = (context) =>
  Provider.provide(Usage.record, (input) => record(input, context))

/**
 * @param {API.Input<Usage.record>} input
 * @param {API.UsageServiceContext} context
 * @returns {Promise<API.Result<API.EgressRecordSuccess, API.EgressRecordFailure>>}
 */
const record = async ({ capability }, context) => {
  const res = await context.usageStorage.record(
    capability.nb.customer,
    capability.nb.resourceCID,
    capability.nb.bytes,
    new Date(capability.nb.servedAt * 1000)
  )
  if (res.error) return res

  return res
}
