import test from 'ava'
import { JSDOM } from 'jsdom'
import 'fake-indexeddb/auto'

import { createAgent } from '../src/index'

test.before((t) => {
  const dom = new JSDOM('<!DOCTYPE html>')
  globalThis.document = dom.window.document
})

test('createAgent', async (t) => {
  const agent = await createAgent()
  t.truthy(agent)
  t.true(agent.did().startsWith('did:key'))
  t.is(agent.spaces.size, 0)
})

test('createSpace', async (t) => {
  const agent = await createAgent()
  const space = await agent.createSpace('test')
  t.truthy(space)
  t.true(space.did.startsWith('did:key:'))
})

test('registerSpace fails if no current space is set', async (t) => {
  const agent = await createAgent()
  await t.throwsAsync(agent.registerSpace('foo@bar.net'))
})
