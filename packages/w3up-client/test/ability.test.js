import assert from 'assert'
import { asAbilities } from '../src/ability.js'

describe('abilities', () => {
  it('should return the passed argument if all abilities are valid', async () => {
    const abilities = ['store/add', 'upload/add']
    assert.equal(asAbilities(abilities), abilities)
  })

  it('should throw an error if one of the abilities is not supported', async () => {
    assert.throws(
      () => {
        asAbilities(['foo/bar'])
      },
      {
        name: 'Error',
        message: 'foo/bar is not a supported capability',
      }
    )
  })
})
