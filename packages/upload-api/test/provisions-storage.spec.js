import { testVariant } from '../src/provisions-storage-tests.js'
import { ProvisionsStorage } from './provisions-storage.js'

describe('in memory provisions storage', () => {
  it('should pass the standard suite of tests', async () => {
    testVariant(async () => new ProvisionsStorage(), it)
  })
})
