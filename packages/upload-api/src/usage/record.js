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
    capability.nb.space
  )
  if (consumerResponse.error) {
    return consumerResponse
  }
  const consumer = consumerResponse.ok
  const res = await context.usageStorage.record(
    // The space which contains the resource that was served.
    capability.nb.space,
    // The customer that is being billed for the egress traffic.
    consumer.customer,
    // CID of the resource that was served.
    capability.nb.resource,
    // Number of bytes that were served.
    capability.nb.bytes,
    // Date and time when the resource was served.
    new Date(capability.nb.servedAt * 1000),
    // Link to the invocation that caused the egress traffic.
    invocation.cid
  )
  return res
}
