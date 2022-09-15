/**
 * Create a promise that resolves in ms.
 * @async
 * @param {number} ms - The number of milliseconds to sleep for.
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
