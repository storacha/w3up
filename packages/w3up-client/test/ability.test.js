import { asAbilities } from '@web3-storage/w3up-client'
import * as Test from './test.js'

/**
 * @type {Test.Suite}
 */
export const testAbilities = {
  'should return the passed argument if all abilities are valid': async (
    assert
  ) => {
    const abilities = ['space/blob/add', 'upload/add']
    assert.equal(asAbilities(abilities), abilities)
  },

  'should throw an error if one of the abilities is not supported': async (
    assert
  ) => {
    assert.throws(
      () => {
        asAbilities(['foo/bar'])
      },
      {
        name: 'Error',
        message: 'foo/bar is not a supported capability',
      }
    )
  },
}

Test.test({ Abilities: testAbilities })
