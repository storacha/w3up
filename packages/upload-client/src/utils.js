/**
 * @template T
 * @param {ReadableStream<T> | NodeJS.ReadableStream} readable
 * @returns {AsyncIterable<T>}
 */
export function toIterable(readable) {
  // @ts-expect-error
  if (readable[Symbol.asyncIterator] != null) return readable

  // Browser ReadableStream
  if ('getReader' in readable) {
    return (async function* () {
      const reader = readable.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })()
  }

  throw new Error('unknown stream')
}

/**
 * @template T
 * @param {AsyncIterable<T>|Iterable<T>} collectable
 * @returns {Promise<T[]>}
 */
export async function collect(collectable) {
  const chunks = []
  for await (const chunk of collectable) chunks.push(chunk)
  return chunks
}
