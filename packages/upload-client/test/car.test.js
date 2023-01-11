import assert from 'assert'
import { CID } from 'multiformats'
import { BlockStream, encode } from '../src/car.js'
import { toCAR } from './helpers/car.js'
import { randomBytes } from './helpers/random.js'

describe('CAR.BlockStream', () => {
  it('creates a stream of blocks from a CAR file', async () => {
    const bytes = await randomBytes(32)
    const car = await toCAR(bytes)
    const stream = new BlockStream(car)
    const chunks = []
    await stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          chunks.push(chunk)
        },
      })
    )
    assert.equal(chunks.length, 1) // should only be enough data for 1 block
  })

  it('allows access to CAR roots', async () => {
    const bytes = await randomBytes(32)
    const car = await toCAR(bytes)
    const stream = new BlockStream(car)
    const roots = await stream.getRoots()
    assert(roots[0])
    assert(car.roots[0])
    assert.equal(roots[0]?.toString(), car.roots[0].toString())
  })
})

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
