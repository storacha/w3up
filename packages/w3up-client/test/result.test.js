import * as Result from '../src/result.js'
import * as Test from './test.js'

/**
 * @type {Test.Suite}
 */
export const testResult = {
  'expect throws on error': async (assert) => {
    assert.throws(() => Result.try({ error: new Error('Boom') }), /Boom/)
  },

  'expect returns ok value if not an error': (assert) => {
    assert.equal(Result.try({ ok: 'ok' }), 'ok')
  },
}

Test.test({ Result: testResult })
