import * as Test from './test.js'
import * as Task from '../src/task.js'

/**
 * @type {Test.BasicSuite}
 
 */
export const taskTests = {
  'task sleep can be aborted': async (assert) => {
    const task = Task.perform(Task.sleep(10))

    task.abort('cancel')

    const result = await task.result()
    assert.deepEqual(result.error?.reason, 'cancel')
    assert.deepEqual(result.error?.name, 'AbortError')
  },

  'sleep awake': async (assert) => {
    const task = Task.perform(Task.sleep(10))
    const result = await task.result()
    assert.deepEqual(result, { ok: undefined })
  },

  'task cancels joined task': async (assert) => {
    let done = false
    function* worker() {
      yield* Task.sleep(10)
      done = true
    }

    function* main() {
      return yield* Task.spawn(worker)
    }

    const task = Task.perform(main())
    task.abort('cancel')
    const result = await task.result()
    assert.deepEqual(result.error?.reason, 'cancel')

    await new Promise((resolve) => setTimeout(resolve, 20))

    assert.deepEqual(done, false)
  },

  'test wait': async (assert) => {
    const task = Task.spawn(function* () {
      const value = yield* Task.wait(Promise.resolve(4))
      return value
    })

    assert.deepEqual(await task.result(), { ok: 4 })
  },
}

Test.basic({ Task: taskTests })
