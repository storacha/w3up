import { describe, expect, it } from 'vitest'

import { createClient } from '../src/index.js'

const fixture = {
  /** @type {import('@ucanto/interface').DID} */
  did: 'did:key:z6MkrZ1r512345678912345678912345678912345678912z',
}

// The two tests marked with concurrent will be run in parallel
describe('client', () => {
  it('when createClient is called, it should return a client.', async () => {
    const client = createClient({
      serviceDID: fixture.did,
      serviceURL: 'http://localhost',
      accessDID: fixture.did,
      accessURL: 'http://localhost',
      settings: new Map(),
    })

    expect(client).not.toBeNull()
  })
})
