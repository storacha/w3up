import * as assert from 'assert'
import * as blobdex from '../src/index.js'

describe('blob-index', async () => {
  await testBlobdex(blobdex, async (name, test) => it(name, test))
})

/**
 * @param {typeof blobdex} blobdex - blobdex module to test
 * @param {import("./test-types.js").TestAdder} test - function to call to add a named test
 */
async function testBlobdex(blobdex, test) {
  await test('module is an object', async () => {
    assert.equal(typeof blobdex, 'object')
  })
  const bd = new blobdex.Blobdex()
  let i = 0
  for (const { keyMH, offset, length } of examples()) {
    await test(`addStr("${keyMH}", ${offset}, ${length})`, async () => {
      bd.addStr(keyMH, offset, length)
      i++
      const [retOffset, retSize] = bd.posStr(keyMH)
      assert.strictEqual(retOffset, offset)
      assert.strictEqual(retSize, length)
      assert.strictEqual(bd.len(), i)
    })
  }
  await test('expected number of items', async () => {
    assert.strictEqual(bd.len(), i)
  })
  await test('encode ordered', async () => {
    const itemMap = bd.encode()
    assert.strictEqual(itemMap.size, i)
    let prevKey = ''
    itemMap.forEach((val, key) => {
      assert.ok(key >= prevKey)
      prevKey = key
    })
    const newBD = new blobdex.Blobdex()
    newBD.decode(itemMap)
    assert.strictEqual(newBD.len(), bd.len())
  })
}

/** @yields examples for testing */
function* examples() {
  yield {
    keyMH: 'QmfQiWhXgzzxAQJtmXELndzHo5DAqmNJjr6PHZKjE3PDxt',
    offset: 0,
    length: 64,
  }
  yield {
    keyMH: 'QmaVwGy5GeDGViCDnJUPepLN8gyzjXHSvGQzboDHQwW5y1',
    offset: 65,
    length: 100,
  }
}
