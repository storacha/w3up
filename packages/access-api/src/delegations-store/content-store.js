import toBuffer from 'it-to-buffer'

/**
 * create a ContentStore backed by (probably in-memory) storage
 *
 * @param {Map<string,Uint8Array>} storage
 */
export function createContentStore(storage = new Map()) {
  /** @type {import("./types").ContentStore} */
  const content = {
    read: async (cid) => {
      if (!storage.has(cid.toString())) {
        return
      }
      const asyncIterator = (async function* () {
        const stored = storage.get(cid.toString())
        if (stored) yield stored
      })()
      return asyncIterator
    },
    write: async (cid, data) => {
      const bytes = await toBuffer(data)
      storage.set(cid.toString(), bytes)
    },
  }
  return content
}
