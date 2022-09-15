import { describe, expect, it } from 'vitest'

import { sleep } from '../src/utils.js'

describe('sleep', () => {
  it.concurrent('it should resolve a promise before X time.', async () => {
    const start = Date.now()

    return sleep(500).then(() => {
      const end = Date.now()

      expect(end).toBeLessThan(start + 550)
    })
  })

  it.concurrent('it should resolve a promise after X time.', async () => {
    const start = Date.now()

    return sleep(500).then(() => {
      const end = Date.now()

      expect(end).toBeGreaterThan(start + 500)
    })
  })
})
