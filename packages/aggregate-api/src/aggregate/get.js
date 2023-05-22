import * as Server from '@ucanto/server'
import * as Aggregate from '@web3-storage/capabilities/aggregate'
import * as API from '../types.js'

/**
 * @param {API.AggregateServiceContext} context
 * @returns {API.UcantoInterface.ServiceMethod<API.AggregateGet, API.AggregateGetResponse, API.UcantoInterface.Failure>}
 */
export function aggregateGetProvider({ aggregateArrangedTable }) {
  return Server.provide(Aggregate.get, async ({ capability }) => {
    const commitmentProof = capability.nb.commitmentProof

    const aggregateArrangedResult = await aggregateArrangedTable.get(
      commitmentProof
    )
    if (!aggregateArrangedResult) {
      return {
        error: new Server.Failure(
          `requested aggregate with commitment proof ${commitmentProof} is not known`
        ),
      }
    }
    return {
      ok: {
        deals: aggregateArrangedResult,
      },
    }
  })
}
