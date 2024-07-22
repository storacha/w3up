import * as API from '../../src/types.js'
import * as StorefrontAPI from '../../src/storefront/api.js'
import * as AggregatorAPI from '../../src/aggregator/api.js'
import * as DealerAPI from '../../src/dealer/api.js'
import * as DealTrackerAPI from '../../src/deal-tracker/api.js'
import { Store } from './store.js'

export const getStoreImplementations = () => ({
  storefront: {
    pieceStore:
      /** @type {StorefrontAPI.PieceStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) => i?.piece.equals(record.piece))
          },
          queryFn: (items, search, options) => {
            const results = Array.from(items)
              .filter((i) => i.insertedAt > (options?.cursor ?? ''))
              .filter((i) => search.status ? i.status === search.status : true)
              .sort((a, b) => (a.insertedAt > b.insertedAt ? 1 : -1))
              .slice(0, options?.size ?? items.size)
            return { results, cursor: results.at(-1)?.insertedAt }
          },
          updateFn: (items, key, item) => {
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
        })
      ),
    taskStore:
      /** @type {StorefrontAPI.TaskStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) => i.cid.equals(record))
          },
        })
      ),
    receiptStore:
      /** @type {StorefrontAPI.ReceiptStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) => i.ran.link().equals(record))
          },
        })
      ),
    contentStore:
      /** @type {API.ReadableStreamStore<import('@ucanto/interface').UnknownLink, Uint8Array>} */
      (
        new Store({
          getFn: (items) => Array.from(items).pop(),
          streamFn: (items, record) => {
            const item = Array.from(items).pop()
            if (!item) {
              return undefined
            }
            return new ReadableStream({
              start(controller) {
                // Push the data into the stream
                controller.enqueue(item)
                // Close the stream
                controller.close()
              },
            })
          },
        })
      ),
  },
  aggregator: {
    pieceStore:
      /** @type {AggregatorAPI.PieceStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) => i?.piece.equals(record.piece))
          },
          updateFn: (items, key, item) => {
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
        })
      ),
    bufferStore:
      /** @type {AggregatorAPI.BufferStore} */
      (
        new Store({
          getFn: (items, record) => {
            // Return first item
            return Array.from(items).find((i) => i.block.equals(record))
          },
        })
      ),
    aggregateStore:
      /** @type {AggregatorAPI.AggregateStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) =>
              i?.aggregate.equals(record.aggregate)
            )
          },
        })
      ),
    inclusionStore:
      /** @type {AggregatorAPI.InclusionStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find(
              (i) =>
                i?.aggregate.equals(record.aggregate) &&
                i?.piece.equals(record.piece)
            )
          },
          queryFn: (items, search) => {
            const filteredItems = Array.from(items).filter((i) => {
              if (search.piece && !i.piece.equals(search.piece)) {
                return false
              } else if (search.group && i.group !== search.group) {
                return false
              }
              return true
            })
            return { results: filteredItems }
          },
        })
      ),
  },
  dealer: {
    aggregateStore:
      /** @type {DealerAPI.AggregateStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) =>
              i?.aggregate.equals(record.aggregate)
            )
          },
          queryFn: (items, search) => {
            return {
              results: Array.from(items).filter(
                (i) => i.status === search.status
              ),
            }
          },
          updateFn: (items, key, item) => {
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
        })
      ),
    offerStore: Object.assign(
      /** @type {DealerAPI.OfferStore<DealerAPI.OfferDocument>} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find((i) => i.key === record)
          },
          updateFn: (items, key, item) => {
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
        })
      ),
    ),
  },
  dealTracker: {
    dealStore:
      /** @type {DealTrackerAPI.DealStore} */
      (
        new Store({
          getFn: (items, record) => {
            return Array.from(items).find(
              (i) => i?.piece.equals(record.piece) && i.dealId === record.dealId
            )
          },
          queryFn: (items, search) => {
            return {
              results: Array.from(items).filter((i) =>
                i.piece.equals(search.piece)
              ),
            }
          },
        })
      ),
  },
})
