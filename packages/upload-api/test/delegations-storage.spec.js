import { testVariant } from './delegations-storage-tests.js'
import { DelegationsStorage } from './delegations-storage.js'

describe('in memory delegations storage', () => {
  it('should pass the standard suite of tests', async () => {
    testVariant(async () => new DelegationsStorage(), it)
  })
})
