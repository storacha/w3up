import { DataAggregationProof, Store } from '../types.js'

export interface ServiceContext {
  /**
   * Stores information about deals for a given aggregate piece CID.
   */
  dealStore: Store<DataAggregationProof[]>
}
