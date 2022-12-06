/**
 * Store interface that all stores need to implement
 */
export interface IStore<T> {
  /**
   * Open store
   */
  open: () => Promise<void>
  /**
   * Clean up and close store
   */
  close: () => Promise<void>
  /**
   * Persist data to the store's backend
   */
  save: (data: T) => Promise<void>
  /**
   * Loads data from the store's backend
   */
  load: () => Promise<T | undefined>
  /**
   * Clean all the data in the store's backend
   */
  reset: () => Promise<void>
}
