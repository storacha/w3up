import { Dealer, DealTracker } from '@web3-storage/filecoin-client'

import { StoreOperationFailed } from '../errors.js'

/**
 * @typedef {import('./api').AggregateRecord} AggregateRecord
 * @typedef {import('./api').AggregateRecordKey} AggregateRecordKey
 */

/**
 * On aggregate insert event, update offer key with date to be retrievable by broker.
 *
 * @param {import('./api').AggregateInsertEventContext} context
 * @param {AggregateRecord} record
 */
export const handleAggregateInsert = async (context, record) => {
  const updateRes = await context.offerStore.update(record.pieces.toString(), {
    key: `${new Date(
      record.insertedAt
    ).toISOString()} ${record.aggregate.toString()}.json`,
  })
  if (updateRes.error) {
    return { error: new StoreOperationFailed(updateRes.error.message) }
  }

  return { ok: {} }
}

/**
 * On Aggregate update status event, issue aggregate accept receipt.
 *
 * @param {import('./api').AggregateUpdatedStatusEventContext} context
 * @param {AggregateRecord} record
 */
export const handleAggregatUpdatedStatus = async (context, record) => {
  const aggregateAcceptInv = await Dealer.aggregateAccept(
    context.dealerInvocationConfig,
    record.aggregate,
    record.pieces,
    { connection: context.dealerConnection }
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
 * @param {import('./api').CronContext} context
 */
export const handleCronTick = async (context) => {
  // Get offered deals pending approval/rejection
  const offeredDeals = await context.aggregateStore.query({
    status: 'offered',
  })
  if (offeredDeals.error) {
    return {
      error: offeredDeals.error,
    }
  }

  // Update approved deals from the ones resolved
  const updatedResponses = await Promise.all(
    offeredDeals.ok.map((deal) =>
      updateApprovedDeals({
        deal,
        aggregateStore: context.aggregateStore,
        dealTrackerServiceConnection: context.dealTrackerConnection,
        dealTrackerInvocationConfig: context.dealTrackerInvocationConfig,
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

  // Return successful update operation
  // Include in response the ones that were Updated, and the ones still pending response.
  const updatedDealsCount = updatedResponses.filter((r) => r.ok?.updated).length
  return {
    ok: {
      updatedCount: updatedDealsCount,
      pendingCount: updatedResponses.length - updatedDealsCount,
    },
  }
}

/**
 * Find out if deal is on chain. When on chain, updates its status in store.
 *
 * @param {object} context
 * @param {AggregateRecord} context.deal
 * @param {import('../types.js').UpdatableAndQueryableStore<AggregateRecordKey, AggregateRecord, Pick<AggregateRecord, 'status'>>} context.aggregateStore
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
      updatedAt: Date.now(),
      deal: {
        dataType: 0n,
        dataSource: {
          dealID: BigInt(deals[0]),
        },
      },
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
