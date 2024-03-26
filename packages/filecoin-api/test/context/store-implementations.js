import { UpdatableStore, StreammableStore } from './store.js'

/**
 * @typedef {import('@ucanto/interface').Link} Link
 * @typedef {import('../../src/storefront/api.js').PieceRecord} PieceRecord
 * @typedef {import('../../src/storefront/api.js').PieceRecordKey} PieceRecordKey
 * @typedef {import('../../src/aggregator/api.js').PieceRecord} AggregatorPieceRecord
 * @typedef {import('../../src/aggregator/api.js').PieceRecordKey} AggregatorPieceRecordKey
 * @typedef {import('../../src/aggregator/api.js').BufferRecord} BufferRecord
 * @typedef {import('../../src/aggregator/api.js').AggregateRecord} AggregateRecord
 * @typedef {import('../../src/aggregator/api.js').AggregateRecordKey} AggregateRecordKey
 * @typedef {import('../../src/aggregator/api.js').InclusionRecord} InclusionRecord
 * @typedef {import('../../src/aggregator/api.js').InclusionRecordKey} InclusionRecordKey
 * @typedef {import('../../src/dealer/api.js').AggregateRecord} DealerAggregateRecord
 * @typedef {import('../../src/dealer/api.js').AggregateRecordKey} DealerAggregateRecordKey
 * @typedef {import('../../src/dealer/api.js').OfferDocument} OfferDocument
 * @typedef {import('../../src/deal-tracker/api.js').DealRecord} DealRecord
 * @typedef {import('../../src/deal-tracker/api.js').DealRecordKey} DealRecordKey
 */
export const getStoreImplementations = (
  StoreImplementation = UpdatableStore,
  StreammableStoreImplementation = StreammableStore
) => ({
  storefront: {
    pieceStore: new StoreImplementation({
      getFn: (
        /** @type {Set<PieceRecord | undefined>} */ items,
        /** @type {PieceRecordKey} */ record
      ) => {
        return Array.from(items).find((i) => i?.piece.equals(record.piece))
      },
      queryFn: (
        /** @type {Set<PieceRecord>} */ items,
        /** @type {Partial<PieceRecord>} */ search
      ) => {
        const filteredItems = Array.from(items).filter((i) => {
          if (i.status === search.status) {
            return true
          }
          return true
        })
        return filteredItems
      },
      updateFn: (
        /** @type {Set<PieceRecord>} */ items,
        /** @type {PieceRecordKey} */ key,
        /** @type {Partial<PieceRecord>} */ item
      ) => {
        const itemToUpdate = Array.from(items).find((i) =>
          i?.piece.equals(key.piece)
        )
        if (!itemToUpdate) {
          throw new Error('not found')
        }
        const updatedItem = {
          ...itemToUpdate,
          ...item,
        }
        items.delete(itemToUpdate)
        items.add(updatedItem)
        return updatedItem
      },
    }),
    taskStore: new StoreImplementation({
      getFn: (
        /** @type {Set<import('@ucanto/interface').Invocation>} */ items,
        /** @type {import('@ucanto/interface').UnknownLink} */ record
      ) => {
        return Array.from(items).find((i) => i.cid.equals(record))
      },
    }),
    receiptStore: new StoreImplementation({
      getFn: (
        /** @type {Set<import('@ucanto/interface').Receipt>} */ items,
        /** @type {import('@ucanto/interface').UnknownLink} */ record
      ) => {
        return Array.from(items).find((i) => i.ran.link().equals(record))
      },
    }),
    dataStore: new StreammableStore({
      streamFn: (
        /** @type {Set<Uint8Array>} */ items,
        /** @type {import('@ucanto/interface').UnknownLink} */ record
      ) => {
        const item = Array.from(items).pop()
        if (!item) {
          return undefined
        }
        const asyncIterableRes = {
          [Symbol.asyncIterator]: async function* () {
            // Yield the Uint8Array asynchronously
            if (item) {
              yield item
            }
          },
        }
        return asyncIterableRes
      },
    }),
  },
  aggregator: {
    pieceStore: new StoreImplementation({
      getFn: (
        /** @type {Set<AggregatorPieceRecord>} */ items,
        /** @type {AggregatorPieceRecordKey} */ record
      ) => {
        return Array.from(items).find((i) => i?.piece.equals(record.piece))
      },
      updateFn: (
        /** @type {Set<AggregatorPieceRecord>} */ items,
        /** @type {AggregatorPieceRecordKey} */ key,
        /** @type {Partial<AggregatorPieceRecord>} */ item
      ) => {
        const itemToUpdate = Array.from(items).find(
          (i) => i?.piece.equals(key.piece) && i.group === key.group
        )
        if (!itemToUpdate) {
          throw new Error('not found')
        }
        const updatedItem = {
          ...itemToUpdate,
          ...item,
        }
        items.delete(itemToUpdate)
        items.add(updatedItem)
        return updatedItem
      },
    }),
    bufferStore: new StoreImplementation({
      getFn: (
        /** @type {Set<BufferRecord>} */ items,
        /** @type {Link} */ record
      ) => {
        // Return first item
        return Array.from(items).find((i) => i.block.equals(record))
      },
    }),
    aggregateStore: new StoreImplementation({
      getFn: (
        /** @type {Set<AggregateRecord>} */ items,
        /** @type {AggregateRecordKey} */ record
      ) => {
        return Array.from(items).find((i) =>
          i?.aggregate.equals(record.aggregate)
        )
      },
    }),
    inclusionStore: new StoreImplementation({
      getFn: (
        /** @type {Set<InclusionRecord>} */ items,
        /** @type {InclusionRecordKey} */ record
      ) => {
        return Array.from(items).find(
          (i) =>
            i?.aggregate.equals(record.aggregate) &&
            i?.piece.equals(record.piece)
        )
      },
      queryFn: (
        /** @type {Set<InclusionRecord>} */ items,
        /** @type {Partial<InclusionRecord>} */ search
      ) => {
        const filteredItems = Array.from(items).filter((i) => {
          if (search.piece && !i.piece.equals(search.piece)) {
            return false
          } else if (
            search.aggregate &&
            !i.aggregate.equals(search.aggregate)
          ) {
            return false
          } else if (search.group && i.group !== search.group) {
            return false
          }
          return true
        })
        return filteredItems
      },
    }),
  },
  dealer: {
    aggregateStore: new StoreImplementation({
      getFn: (
        /** @type {Set<DealerAggregateRecord>} */ items,
        /** @type {DealerAggregateRecordKey} */ record
      ) => {
        return Array.from(items).find((i) =>
          i?.aggregate.equals(record.aggregate)
        )
      },
      queryFn: (
        /** @type {Set<DealerAggregateRecord>} */ items,
        /** @type {Partial<DealerAggregateRecord>} */ search
      ) => {
        return Array.from(items).filter(
          (i) =>
            i.status === search.status || i.aggregate.equals(search.aggregate)
        )
      },
      updateFn: (
        /** @type {Set<DealerAggregateRecord>} */ items,
        /** @type {DealerAggregateRecordKey} */ key,
        /** @type {Partial<DealerAggregateRecord>} */ item
      ) => {
        const itemToUpdate = Array.from(items).find((i) =>
          i.aggregate.equals(key.aggregate)
        )
        if (!itemToUpdate) {
          throw new Error('not found')
        }
        const updatedItem = {
          ...itemToUpdate,
          ...item,
        }
        items.delete(itemToUpdate)
        items.add(updatedItem)
        return updatedItem
      },
    }),
    offerStore: new StoreImplementation({
      getFn: (
        /** @type {Set<OfferDocument>} */ items,
        /** @type {string} */ record
      ) => {
        return Array.from(items).find((i) => i.key === record)
      },
      updateFn: (
        /** @type {Set<OfferDocument>} */ items,
        /** @type {string} */ key,
        /** @type {Partial<OfferDocument>} */ item
      ) => {
        const lastItem = Array.from(items).pop()
        if (!lastItem) {
          throw new Error('not found')
        }

        const nItem = {
          ...lastItem,
          ...item,
        }

        items.delete(lastItem)
        items.add(nItem)

        return nItem
      },
    }),
  },
  dealTracker: {
    dealStore: new StoreImplementation({
      getFn: (
        /** @type {Set<DealRecord>} */ items,
        /** @type {DealRecordKey} */ record
      ) => {
        return Array.from(items).find(
          (i) => i?.piece.equals(record.piece) && i.dealId === record.dealId
        )
      },
      queryFn: (
        /** @type {Set<DealRecord>} */ items,
        /** @type {Partial<DealRecord>} */ search
      ) => {
        return Array.from(items).filter((i) => i.piece.equals(search.piece))
      },
    }),
  },
})
