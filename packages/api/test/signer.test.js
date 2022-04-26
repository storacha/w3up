import assert from 'assert'
import { Miniflare } from 'miniflare'

describe('auth ap', function () {
  /** @type {Miniflare} */
  let mf
  before(() => {
    // Create a new Miniflare environment for each test
    mf = new Miniflare({
      // Autoload configuration from `.env`, `package.json` and `wrangler.toml`
      envPath: true,
      packagePath: true,
      wranglerConfigPath: true,
    })
  })

  it('should work', async function () {
    const res = await mf.dispatchFetch('http://localhost:8787')
    assert.deepEqual(await res.json(), { msg: 'hello world!' })
  })
})
