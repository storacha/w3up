import { test, expect } from 'vitest'
import 'fake-indexeddb/auto'

import { createAgent } from '../src/index.js'

test('createAgent', async () => {
  const agent = await createAgent()
  expect(agent).toBeTruthy()
  expect(agent.did().startsWith('did:key')).toBe(true)
  expect(agent.spaces.size).to.eql(0)
})

test('createSpace', async () => {
  const agent = await createAgent()
  const space = await agent.createSpace('test')
  expect(space).toBeTruthy()
  expect(space.did.startsWith('did:key:')).toBe(true)
})

test('registerSpace fails if no current space is set', async () => {
  const agent = await createAgent()
  await expect(agent.registerSpace('foo@bar.net')).rejects.toThrowError()
})
