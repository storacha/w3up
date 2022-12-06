/**
 * Driver interface that all drivers implement.
 */
export interface Driver<T> {
  /**
   * Open driver
   */
  open: () => Promise<void>
  /**
   * Clean up and close driver
   */
  close: () => Promise<void>
  /**
   * Persist data to the driver's backend
   */
  save: (data: T) => Promise<void>
  /**
   * Loads data from the driver's backend
   */
  load: () => Promise<T | undefined>
  /**
   * Clean all the data in the driver's backend
   */
  reset: () => Promise<void>
}
