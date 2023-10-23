import type { Signer } from '@ucanto/interface'
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
    AggregatorInterface.AggregateInsertEventToAggregateOfferContext,
    AggregatorInterface.AggregateInsertEventToPieceAcceptQueueContext,
    AggregatorInterface.BufferMessageContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types').StorefrontService['filecoin']>
    piece: Partial<import('../src/types').AggregatorService['piece']>
    aggregate: Partial<import('../src/types').DealerService['aggregate']>
    deal: Partial<import('../src/types').DealTrackerService['deal']>
  }>
}

export interface DealerTestEventsContext
  extends DealerInterface.AggregateInsertEventContext,
    DealerInterface.AggregateUpdatedStatusEventContext,
    DealerInterface.CronContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types').StorefrontService['filecoin']>
    piece: Partial<import('../src/types').AggregatorService['piece']>
    aggregate: Partial<import('../src/types').DealerService['aggregate']>
    deal: Partial<import('../src/types').DealTrackerService['deal']>
  }>
}

export interface TestEventsContext
  extends StorefrontInterface.FilecoinSubmitMessageContext,
    StorefrontInterface.PieceOfferMessageContext,
    StorefrontInterface.StorefrontClientContext,
    StorefrontInterface.CronContext {
  id: Signer
  service: Partial<{
    filecoin: Partial<import('../src/types').StorefrontService['filecoin']>
    piece: Partial<import('../src/types').AggregatorService['piece']>
    aggregate: Partial<import('../src/types').DealerService['aggregate']>
    deal: Partial<import('../src/types').DealTrackerService['deal']>
  }>
}
