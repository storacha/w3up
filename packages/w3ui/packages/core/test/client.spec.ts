import { test, expect } from 'vitest'
import 'fake-indexeddb/auto'

import { createClient } from '../src/index'

test('createClient', async () => {
  const { client } = await createClient()
  expect(client).toBeTruthy()
  expect(client.did().startsWith('did:key')).toBe(true)
  expect(client.spaces().length).to.eql(0)
})

test('createSpace', async () => {
  const { client } = await createClient()
  const space = await client.createSpace('test')
  expect(space).toBeTruthy()
  expect(space.did().startsWith('did:key:')).toBe(true)
})
