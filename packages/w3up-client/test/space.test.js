import * as Signer from '@ucanto/principal/ed25519'
import assert from 'assert'
import { Space } from '../src/space.js'

describe('spaces', () => {
  it('should get meta', async () => {
    const signer = await Signer.generate()
    const name = `space-${Date.now()}`
    const isRegistered = true
    const space = new Space(signer.did(), { name, isRegistered })
    assert.equal(space.did(), signer.did())
    assert.equal(space.name(), name)
    assert.equal(space.registered(), isRegistered)
    assert.equal(space.meta().name, name)
  })
})
