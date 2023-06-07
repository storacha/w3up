import * as Server from '@ucanto/server'
import * as Aggregate from '@web3-storage/capabilities/aggregate'
import * as API from '../types.js'

/**
 * @param {API.AggregateServiceContext} context
 */
export const provide = (context) =>
  Server.provide(Aggregate.get, (input) => claim(input, context))

/**
 * @param {API.Input<Aggregate.get>} input
 * @param {API.AggregateServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateGetSuccess, API.AggregateGetFailure>>}
 */
export const claim = async ({ capability }, { aggregateStore }) => {
  const commitmentProof = capability.nb.commitmentProof

  const aggregateArrangedResult = await aggregateStore.get(commitmentProof)
  if (!aggregateArrangedResult) {
    return {
      error: new AggregateNotFound(
        `aggregate not found for commitment proof: ${commitmentProof}`
      ),
    }
  }
  return {
    ok: {
      deals: aggregateArrangedResult,
    },
  }
}

class AggregateNotFound extends Server.Failure {
  get name() {
    return /** @type {const} */ ('AggregateGetFailure')
  }
}
