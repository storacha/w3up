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
const record = async ({ capability, invocation }, context) => {
  const provider = /** @type {`did:web:${string}`} */ (
    invocation.audience.did()
  )
  const consumerResponse = await context.provisionsStorage.getConsumer(
    provider,
    capability.with
  )
  if (consumerResponse.error) {
    return {
      error: {
        name: 'EgressRecordFailure',
        message: `Failed to get consumer`,
      },
    }
  }
  const consumer = consumerResponse.ok
  const res = await context.usageStorage.record(
    consumer.customer,
    capability.nb.resource,
    capability.nb.bytes,
    new Date(capability.nb.servedAt * 1000)
  )
  if (res.error) return res

  return res
}
