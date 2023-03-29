import assert from 'assert'
import { AgentData } from '../src/agent-data.js'

describe('AgentData', () => {
  it('should not destructure store methods', async () => {
    // eslint-disable-next-line unicorn/no-await-expression-member
    const raw = (await AgentData.create()).export()
    class Store {
      async open() {}
      async close() {}
      async load() {
        return raw
      }

      async reset() {}
      async save() {
        if (!(this instanceof Store)) {
          throw new TypeError('unexpected this value')
        }
      }
    }
    const store = new Store()
    const data = await AgentData.create(undefined, { store })
    await assert.doesNotReject(data.setCurrentSpace('did:key:y'))
  })
})
