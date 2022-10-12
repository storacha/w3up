import { UCAN } from '@ucanto/core'

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

/**
 * @throws {Error}
 * @param {string} url
 * @returns {Promise<UCAN.JWT>}
 */
export async function checkUrl(url) {
  //     const { account } = await this.identity()
  let count = 0

  /**
   * @throws {Error}
   * @returns {Promise<UCAN.JWT>}
   */
  const check = async () => {
    if (count > 100) {
      throw new Error('Could not validate.')
    } else {
      count++
      const result = await fetch(
        url,
        //           `${this.accessURL}validate?did=${account.did()}`,
        {
          mode: 'cors',
        }
      )

      if (!result.ok) {
        await sleep(1000)
        return await check()
      } else {
        // @ts-ignore
        return await result.text()
      }
    }
  }

  return await check()
}
