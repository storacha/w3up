import * as Result from '../src/result.js'
import assert from 'assert'

describe('Result', () => {
  it('expect throws on error', async () => {
    assert.throws(() => Result.expect({ error: new Error('Boom') }), /Boom/)
  })

  it('expect can take error message', async () => {
    let error = null
    try {
      Result.expect({ error: new Error('Boom') }, 'Unexpected error')
    } catch (cause) {
      error = /** @type {Error} */ (cause)
    }

    assert.equal(error?.message, 'Unexpected error')
    assert.equal(Object(error?.cause).message, 'Boom')
  })

  it('expect returns ok value if not an error', () => {
    assert.equal(Result.expect({ ok: 'ok' }), 'ok')
  })
})
