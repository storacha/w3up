import assert from 'assert'
import Client from '../src/index.js'

describe('index', function () {
  it('should export a client object', () => {
    assert(Client)
  })
})
