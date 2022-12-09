import assert from 'assert'
import { Buffer } from 'node:buffer'
import { ConfDriver } from '../../src/drivers/conf.js'

describe('Conf driver', () => {
  it('should not fail on to store undefined value', async () => {
    const driver = new ConfDriver({ profile: 'w3protocol-access-client-test' })
    await driver.reset()
    await driver.save({ foo: undefined, bar: 1 })
    const data = await driver.load()
    assert(data)
    assert.strictEqual(data.foo, undefined)
    assert.strictEqual(data.bar, 1)
  })

  it('should store a Buffer', async () => {
    const driver = new ConfDriver({ profile: 'w3protocol-access-client-test' })
    await driver.reset()
    await driver.save({ buf: Buffer.from('⁂', 'utf8') })
    const actual = await driver.load()
    assert(actual)
    assert.deepEqual(actual.buf, new TextEncoder().encode('⁂'))
  })
})
