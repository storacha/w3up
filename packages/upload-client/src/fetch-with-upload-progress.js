// HTTP/2 or Node.js/undici

/**
 *
 * @param {AsyncIterable<Uint8Array>} iterable
 * @returns {ReadableStream}
 */
function iterableToStream(iterable) {
  return new ReadableStream({
    async pull(controller) {
      const iterator = iterable[Symbol.asyncIterator]()
      const { value, done } = await iterator.next()
      if (value) {
        controller.enqueue(value)
      }
      if (done) {
        controller.close()
      }
    },
  })
}

/**
 * Takes body from fetch response as body and `onUploadProgress` handler
 * and returns async iterable that emits body chunks and emits
 * `onUploadProgress`.
 *
 * @param {ReadableStream} body
 * @param {import('./types.js').ProgressFn} onUploadProgress
 * @returns {AsyncIterable<Uint8Array>}
 */
const iterateBodyWithProgress = async function* (body, onUploadProgress) {
  if (body instanceof ReadableStream) {
    const reader = body.getReader()
    const total = 0 // If the total size is unknown
    const lengthComputable = false
    let loaded = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        loaded += value.byteLength
        yield value // Yield the chunk
        onUploadProgress({ total, loaded, lengthComputable })
      }
    } finally {
      reader.releaseLock() // Ensure the reader lock is released
    }
  }
}

/**
 * Takes fetch options and wraps request body to track upload progress if
 * `onUploadProgress` is supplied. Otherwise returns options as is.
 *
 * @param {import('./types.js').FetchOptions} options
 * @returns {import('./types.js').FetchOptions}
 */
const withUploadProgress = (options) => {
  const { onUploadProgress, body } = options

  const rsp = new Response(body)
  // @ts-expect-error web streams from node and web have different types
  const source = iterateBodyWithProgress(rsp.body, onUploadProgress)
  const stream = iterableToStream(source)
  return {
    ...options,
    body: stream,
  }
}

// HTTP/1.1 and browsers

/* c8 ignore start */
/**
 *
 * @param {string} url
 * @param {import('./types.js').FetchOptions} init
 */
const fetchXhr = (url, { onUploadProgress, ...init }) => {
  if (onUploadProgress) {
    return /** @type {Promise<Response>} */ (
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(init.method || 'GET', url, true)
        xhr.upload.addEventListener('progress', (e) =>
          onUploadProgress({
            total: e.total,
            loaded: e.loaded,
            lengthComputable: e.lengthComputable,
            url,
          })
        )
        xhr.upload.addEventListener('loadend', (e) =>
          onUploadProgress({
            total: e.total,
            loaded: e.loaded,
            lengthComputable: e.lengthComputable,
            url,
          })
        )
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            // @ts-expect-error doesn't have to match Response 100%
            resolve({
              status: xhr.status,
              statusText: xhr.statusText,
              body: xhr.response,
              ok: ((xhr.status / 100) | 0) == 2,
            })
          }
        }
        xhr.onerror = (err) => reject(err)
        Object.entries(init.headers || {}).forEach(([key, value]) =>
          xhr.setRequestHeader(key, value)
        )
        /**
         * @type {XMLHttpRequestBodyInit}
         */
        // @ts-expect-error ReadableStream as body is not supported by XHR
        const body = init.body
        xhr.send(body)
      })
    )
  } else {
    return fetch(url, init)
  }
}

/* c8 ignore stop */

// Deno supports H1 streaming
const isNode =
  typeof process !== 'undefined' &&
  process.versions.node &&
  !process.versions.bun &&
  !process.versions.deno
const isBrowser = typeof globalThis.XMLHttpRequest !== 'undefined'

/**
 * @type {import('./types.js').FetchWithUploadProgress}
 */
export const fetchWithUploadProgress = (url, init = {}) => {
  // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/nextHopProtocol
  /**
   * @type {string | undefined}
   */
  const protocol =
    // @ts-expect-error nextHopProtocol is missing from types but is widely available
    performance.getEntriesByType('resource')[0]?.nextHopProtocol
  const preH2 = protocol !== 'h2' && protocol !== 'h2c' && protocol !== 'h3'

  /* c8 ignore next 3 */
  if ((isBrowser || preH2) && !isNode) {
    return fetchXhr(url, init)
  }
  return fetch(url, withUploadProgress(init))
}
