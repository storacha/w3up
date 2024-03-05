import * as Result from '../src/result.js'
import assert from 'assert'

describe('Result', () => {
  it('expect throws on error', async () => {
    assert.throws(() => Result.unwrap({ error: new Error('Boom') }), /Boom/)
  })

  it('expect returns ok value if not an error', () => {
    assert.equal(Result.unwrap({ ok: 'ok' }), 'ok')
  })
})
