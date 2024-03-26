import type { Signer } from '@ucanto/interface'
import { AssertInclusionServiceMethod } from '../src/aggregator/api.js'
import * as AggregatorInterface from '../src/aggregator/api.js'
import * as DealerInterface from '../src/dealer/api.js'
import * as StorefrontInterface from '../src/storefront/api.js'

export interface AggregatorTestEventsContext
  extends AggregatorInterface.PieceMessageContext,
    AggregatorInterface.PieceAcceptMessageContext,
    AggregatorInterface.AggregateOfferMessageContext,
    AggregatorInterface.PieceInsertEventContext,
    AggregatorInterface.InclusionInsertEventToUpdateState,
    AggregatorInterface.InclusionInsertEventToIssuePieceAccept,
    AggregatorInterface.InclusionInsertEventToIssueInclusionClaim,
    AggregatorInterface.AggregateInsertEventToAggregateOfferContext,
    AggregatorInterface.AggregateInsertEventToPieceAcceptQueueContext,
    AggregatorInterface.BufferMessageContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types.js').StorefrontService['filecoin']>
    piece: Partial<import('../src/types.js').AggregatorService['piece']>
    aggregate: Partial<import('../src/types.js').DealerService['aggregate']>
    deal: Partial<import('../src/types.js').DealTrackerService['deal']>
  }>
  contentClaimsService: {
    assert: {
      inclusion: AssertInclusionServiceMethod
    }
  }
}

export interface DealerTestEventsContext
  extends DealerInterface.AggregateInsertEventContext,
    DealerInterface.AggregateUpdatedStatusEventContext,
    DealerInterface.CronContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types.js').StorefrontService['filecoin']>
    piece: Partial<import('../src/types.js').AggregatorService['piece']>
    aggregate: Partial<import('../src/types.js').DealerService['aggregate']>
    deal: Partial<import('../src/types.js').DealTrackerService['deal']>
  }>
}

export interface StorefrontTestEventsContext
  extends StorefrontInterface.FilecoinSubmitMessageContext,
    StorefrontInterface.PieceOfferMessageContext,
    StorefrontInterface.StorefrontClientContext,
    StorefrontInterface.CronContext {
  id: Signer
  aggregatorId: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types.js').StorefrontService['filecoin']>
    piece: Partial<import('../src/types.js').AggregatorService['piece']>
    aggregate: Partial<import('../src/types.js').DealerService['aggregate']>
    deal: Partial<import('../src/types.js').DealTrackerService['deal']>
  }>
}
