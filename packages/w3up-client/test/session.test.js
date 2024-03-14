import * as Test from './test.js'
import { alice, bob, mallory, service } from './fixtures/principals.js'
import * as Agent from '../src/agent.js'
import * as Result from '../src/result.js'
import * as Session from '../src/session.js'
import * as Task from '../src/task.js'
import { Console } from '@web3-storage/capabilities'

/**
 * @type {Test.Suite}
 */
export const testSession = {
  'test execute': async (assert, { session, service }) => {
    session.connection
    const task = Console.log.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: { value: 'Hello, World!' },
    })

    const output = await Session.execute(session, task)
    assert.deepEqual(output, 'Hello, World!')
  },
  'test execute receipt': async (assert, { session, service }) => {
    session.connection
    const task = Console.log.invoke({
      issuer: service,
      audience: service,
      with: service.did(),
      nb: { value: { x: 1 } },
    })

    const receipt = await Session.execute(session, task).receipt()
    assert.deepEqual(receipt.out, { ok: { x: 1 } })
    assert.deepEqual(await receipt.verifySignature(service.verifier), {
      ok: {},
    })
  },
  'test from task': async (assert, { session, service }) => {
    const invocation = Task.spawn(function* () {
      const task = Console.log.invoke({
        issuer: service,
        audience: service,
        with: service.did(),
        nb: { value: { x: 1 } },
      })

      return yield* Session.execute(session, task)
    })

    assert.deepEqual(await invocation, { x: 1 })
  },
  'test from task receipt': async (assert, { session, service }) => {
    const invocation = Task.spawn(function* () {
      const task = Console.log.invoke({
        issuer: service,
        audience: service,
        with: service.did(),
        nb: { value: { x: 1 } },
      })

      return yield* Session.execute(session, task).receipt()
    })

    const receipt = await invocation

    assert.deepEqual(receipt.out, { ok: { x: 1 } })
  },
}

Test.test({ Session: testSession })
