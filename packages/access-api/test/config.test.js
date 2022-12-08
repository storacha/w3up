import assert from 'assert'
import * as configModule from '../src/config.js'

describe('@web3-storage/access-api/src/config configureSigner', () => {
  it('configureSigner creates a signer using config.{DID,PRIVATE_KEY}', async () => {
    const config = {
      PRIVATE_KEY:
        'MgCYWjE6vp0cn3amPan2xPO+f6EZ3I+KwuN1w2vx57vpJ9O0Bn4ci4jn8itwc121ujm7lDHkCW24LuKfZwIdmsifVysY=',
      DID: 'did:web:example.com',
    }
    const signer = configModule.configureSigner(config)
    assert.ok(signer)
    assert.equal(signer.did().toString(), config.DID)
  })
  it('configureSigner infers did from config.PRIVATE_KEY when config.DID is omitted', async () => {
    const testKey = {
      PRIVATE_KEY:
        'MgCYWjE6vp0cn3amPan2xPO+f6EZ3I+KwuN1w2vx57vpJ9O0Bn4ci4jn8itwc121ujm7lDHkCW24LuKfZwIdmsifVysY=',
      didKey: 'did:key:z6MkqBzPG7oNu7At8fktasQuS7QR7Tj7CujaijPMAgzdmAxD',
    }
    const config = {
      PRIVATE_KEY: testKey.PRIVATE_KEY,
    }
    const signer = configModule.configureSigner(config)
    assert.ok(signer)
    assert.equal(signer.did().toString(), testKey.didKey)
  })
})
