import assert from 'assert'
import { CID } from 'multiformats'
import { encode } from '../src/car.js'

describe('CAR.encode', () => {
  it('propagates error when source throws', async () => {
    // eslint-disable-next-line require-yield
    const blocks = (async function* () {
      throw new Error('boom')
    })()
    const root = CID.parse(
      'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'
    )
    await assert.rejects(encode(blocks, root), { message: 'boom' })
  })
})
