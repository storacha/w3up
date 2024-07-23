import { Dealer, DealTracker } from '@web3-storage/filecoin-client'

import { StoreOperationFailed } from '../errors.js'

/**
 * @typedef {import('./api.js').AggregateRecord} AggregateRecord
 * @typedef {import('./api.js').AggregateRecordKey} AggregateRecordKey
 */

/** Max items per page of query. */
const MAX_PAGE_SIZE = 20

/**
 * On aggregate insert event, update offer key with date to be retrievable by broker.
 *
 * @param {import('./api.js').AggregateInsertEventContext} context
 * @param {AggregateRecord} record
 */
export const handleAggregateInsert = async (context, record) => {
  const updateRes = await context.offerStore.update(record.pieces.toString(), {
    key: `${new Date(
      record.insertedAt
    ).toISOString()}_${record.aggregate.toString()}.json`,
  })
  if (updateRes.error) {
    return { error: new StoreOperationFailed(updateRes.error.message) }
  }

  return { ok: {} }
}

/**
 * On Aggregate update status event, issue aggregate accept receipt.
 *
 * @param {import('./api.js').AggregateUpdatedStatusEventContext} context
 * @param {AggregateRecord} record
 */
export const handleAggregateUpdatedStatus = async (context, record) => {
  const aggregateAcceptInv = await Dealer.aggregateAccept(
    context.dealerService.invocationConfig,
    record.aggregate,
    record.pieces,
    { connection: context.dealerService.connection }
  )
  if (aggregateAcceptInv.out.error) {
    return {
      error: aggregateAcceptInv.out.error,
    }
  }

  return { ok: {} }
}

/**
 * On cron tick event, get aggregates without deals, and verify if there are updates on them.
 * If there are deals for pending aggregates, their state can be updated.
 *
 * @param {import('./api.js').CronContext} context
 */
export const handleCronTick = async (context) => {
  let totalDealsCount = 0
  let updatedDealsCount = 0
  /** @type {string|undefined} */
  let cursor
  do {
    // Get offered deals pending approval/rejection
    const offeredDeals = await context.aggregateStore.query(
      {
        status: 'offered',
      },
      { cursor, size: MAX_PAGE_SIZE }
    )
    if (offeredDeals.error) {
      return {
        error: offeredDeals.error,
      }
    }
    totalDealsCount += offeredDeals.ok.results.length

    // Update approved deals from the ones resolved
    const updatedResponses = await Promise.all(
      offeredDeals.ok.results.map((deal) =>
        updateApprovedDeals({
          deal,
          aggregateStore: context.aggregateStore,
          dealTrackerServiceConnection: context.dealTrackerService.connection,
          dealTrackerInvocationConfig:
            context.dealTrackerService.invocationConfig,
        })
      )
    )

    // Fail if one or more update operations did not succeed.
    // The successful ones are still valid, but we should keep track of errors for monitoring/alerting.
    const updateErrorResponse = updatedResponses.find((r) => r.error)
    if (updateErrorResponse) {
      return {
        error: updateErrorResponse.error,
      }
    }

    updatedDealsCount += updatedResponses.filter((r) => r.ok?.updated).length
    cursor = offeredDeals.ok.cursor
  } while (cursor)

  // Return successful update operation
  // Include in response the ones that were Updated, and the ones still pending response.
  return {
    ok: {
      updatedCount: updatedDealsCount,
      pendingCount: totalDealsCount - updatedDealsCount,
    },
  }
}

/**
 * Find out if deal is on chain. When on chain, updates its status in store.
 *
 * @param {object} context
 * @param {AggregateRecord} context.deal
 * @param {import('../types.js').UpdatableStore<AggregateRecordKey, AggregateRecord>} context.aggregateStore
 * @param {import('@ucanto/interface').ConnectionView<any>} context.dealTrackerServiceConnection
 * @param {import('@web3-storage/filecoin-client/types').InvocationConfig} context.dealTrackerInvocationConfig
 */
async function updateApprovedDeals({
  deal,
  aggregateStore,
  dealTrackerServiceConnection,
  dealTrackerInvocationConfig,
}) {
  // Query current state
  const info = await DealTracker.dealInfo(
    dealTrackerInvocationConfig,
    deal.aggregate,
    { connection: dealTrackerServiceConnection }
  )

  if (info.out.error) {
    return {
      error: info.out.error,
    }
  }

  // If there are no deals for it, we can skip
  const deals = Object.keys(info.out.ok.deals || {})
  if (!deals.length) {
    return {
      ok: {
        updated: false,
      },
    }
  }

  // Update status and deal information
  const updateAggregate = await aggregateStore.update(
    { aggregate: deal.aggregate },
    {
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    }
  )

  if (updateAggregate.error) {
    return {
      error: updateAggregate.error,
    }
  }

  return {
    ok: {
      updated: true,
    },
  }
}
