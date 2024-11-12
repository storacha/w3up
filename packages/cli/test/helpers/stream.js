const empty = () => EMPTY

/**
 * @template {{}} T
 * @typedef {ReadableStream<T>|AsyncIterable<T>|Iterable<T>} Source
 */

/**
 * @template {{}} T
 * @param {Source<T>} source
 * @returns {Resource<T>}
 */
const toResource = (source) => {
  if ('getReader' in source) {
    return source.getReader()
  } else {
    const iterator =
      Symbol.asyncIterator in source
        ? source[Symbol.asyncIterator]()
        : source[Symbol.iterator]()

    return {
      async read() {
        return /** @type {ReadableStreamReadResult<T>} */ (
          await iterator.next()
        )
      },
      releaseLock() {
        return iterator.return?.()
      },
      async cancel(reason) {
        if (reason != null) {
          if (iterator.throw) {
            await iterator.throw(reason)
          } else if (iterator.return) {
            await iterator.return()
          }
        } else {
          await iterator.return?.()
        }
      },
    }
  }
}

/**
 * @template {{}} T
 * @param {ReadableStream<T>|AsyncIterable<T>|Iterable<T>} source
 * @returns {Stream<T>}
 */
export const from = (source) => new Stream(toResource(source), {}, Direct)

/**
 * @template {{}} T
 * @param {Resource<T>} source
 * @param {number} n
 * @returns {Stream<T, number>}
 */
const take = (source, n = 1) =>
  new Stream(source, n, /** @type {Transform<T, number>} */ (Take))

const Take = {
  /**
   * @template T
   * @param {number} n
   * @param {T} input
   * @returns {[number|undefined, T[]]}
   */
  write: (n, input) => {
    if (n > 0) {
      return input != null ? [n - 1, [input]] : [n, []]
    } else {
      return [undefined, []]
    }
  },
  flush: empty,
}

/**
 * @param {Resource<Uint8Array>} source
 * @returns {ByteStream<{}>}
 */
const toByteStream = (source) => new ByteStream(source, {}, Direct)

/**
 * @template {{}} T
 * @param {Resource<T>} source
 * @returns {Reader<T>}
 */
const toReader = (source) => new Reader(source)

/**
 * @template T
 * @param {Resource<T>} source
 */
const collect = async (source) => {
  const chunks = []
  for await (const chunk of iterate(source)) {
    chunks.push(chunk)
  }

  return chunks
}

/**
 * @param {Resource<Uint8Array>} source
 * @param {number} chunkSize
 * @returns {ByteStream}
 */
const chop = (source, chunkSize) =>
  new ByteStream(source, new Uint8Array(chunkSize), Chop)

const Chop = {
  /**
   * @param {Uint8Array} bytes
   * @param {Uint8Array} input
   * @returns {[Uint8Array, Uint8Array[]]}
   */
  write(bytes, input) {
    const { byteLength } = bytes.buffer
    if (bytes.length + input.length < byteLength) {
      const buffer = new Uint8Array(
        bytes.buffer,
        0,
        bytes.length + input.length
      )
      buffer.set(input, bytes.length)
      return [buffer, []]
    } else {
      const chunk = new Uint8Array(byteLength)
      chunk.set(bytes, 0)
      chunk.set(input.slice(0, byteLength - bytes.length), bytes.length)

      const chunks = [chunk]

      let offset = byteLength - bytes.length
      while (offset + byteLength < input.length) {
        chunks.push(input.subarray(offset, offset + byteLength))
        offset += byteLength
      }

      const buffer = new Uint8Array(bytes.buffer, 0, input.length - offset)
      buffer.set(input.subarray(offset), 0)

      return [buffer, chunks]
    }
  },
  /**
   * @param {Uint8Array} bytes
   */
  flush(bytes) {
    return bytes.length ? [bytes] : []
  },
}

/**
 * @param {Resource<Uint8Array>} source
 * @param {number} byte
 */
const delimit = (source, byte) =>
  new ByteStream(source, { buffer: new Uint8Array(0), code: byte }, Delimiter)

const Delimiter = {
  /**
   * @param {{code: number, buffer:Uint8Array}} state
   * @param {Uint8Array} input
   * @returns {[{code: number, buffer:Uint8Array}|undefined, Uint8Array[]]}
   */
  write({ code, buffer }, input) {
    let start = 0
    let end = 0
    const chunks = []
    while (end < input.length) {
      const byte = input[end]
      end++
      if (byte === code) {
        const segment = input.subarray(start, end)
        if (buffer.length > 0) {
          const chunk = new Uint8Array(buffer.length + segment.length)
          chunk.set(buffer, 0)
          chunk.set(segment, buffer.length)
          chunks.push(chunk)
          buffer = new Uint8Array(0)
        } else {
          chunks.push(segment)
        }
        start = end
      }
    }

    const segment = input.subarray(start, end)
    const chunk = new Uint8Array(buffer.length + segment.length)
    chunk.set(buffer, 0)
    chunk.set(segment, buffer.length)

    return [{ code, buffer }, chunks]
  },
  /**
   * @param {{code: number, buffer:Uint8Array}} state
   */
  flush({ buffer }) {
    return buffer.length ? [buffer] : []
  },
}

/**
 * @template {{}} Out
 * @template {{}} State
 * @template {{}} [In=Out]
 * @typedef {object} Transform
 * @property {(state: State, input: In) => [State|undefined, Out[]]} write
 * @property {(state: State) => Out[]} flush
 */
/**
 * @template {{}} Out
 * @template {{}} State
 * @template {{}} In
 * @param {Resource<In>} source
 * @param {State} state
 * @param {Transform<Out, State, In>} transform
 * @returns {Stream<Out, State, In>}
 */
const transform = (source, state, transform) =>
  new Stream(source, state, transform)

/**
 * @template T
 * @param {Resource<T>} source
 */
const iterate = async function* (source) {
  try {
    while (true) {
      const { value, done } = await source.read()
      if (done) break
      yield value
    }
  } catch (error) {
    source.cancel(/** @type {{}} */ (error))
    source.releaseLock()
    throw error
  }
}

const Direct = {
  /**
   * @template {{}} T
   * @template {{}} State
   * @param {State} state
   * @param {T} input
   */
  write(state, input) {
    OUT.pop()
    if (input != null) {
      OUT.push(input)
    }
    STEP[0] = state
    return STEP
  },
  /**
   * @returns {never[]}
   */
  flush() {
    return EMPTY
  },
}
/**
 * @template {{}} Out
 * @template {{}} [State={}]
 * @template {{}} [In=Out]
 * @extends {ReadableStream<Out>}
 */
export class Stream extends ReadableStream {
  /**
   * @param {Resource<In>} source
   * @param {State} state
   * @param {Transform<Out, State, In>} transformer
   */
  constructor(source, state, { write, flush }) {
    super({
      /**
       * @param {ReadableStreamDefaultController<Out>} controller
       */
      pull: async (controller) => {
        try {
          const { done, value } = await source.read()
          if (done) {
            controller.close()
            source.releaseLock()
          } else {
            const [next, output] = write(state, value)
            for (const item of output) {
              controller.enqueue(item)
            }

            if (next) {
              state = next
            } else {
              controller.close()
              source.cancel()
              source.releaseLock()
            }
          }
        } catch (error) {
          controller.error(error)
          source.releaseLock()
        }
      },
      cancel(controller) {
        source.cancel()
        source.releaseLock()
        for (const item of flush(state)) {
          controller.enqueue(item)
        }
      },
    })
  }

  /**
   * @template {{}} State
   * @template {{}} T
   * @param {State} state
   * @param {Transform<T, State, Out>} transformer
   */
  transform(state, transformer) {
    return transform(this.getReader(), state, transformer)
  }

  /**
   * @returns {Reader<Out>}
   */
  reader() {
    return toReader(this.getReader())
  }

  /**
   * @returns {AsyncIterable<Out>}
   */
  [Symbol.asyncIterator]() {
    return iterate(this.getReader())
  }

  /**
   * @param {number} n
   */
  take(n = 1) {
    return take(this.getReader(), n)
  }

  collect() {
    return collect(this.getReader())
  }
}

/**
 * @template {{}} [State={}]
 * @extends {Stream<Uint8Array, State>}
 */
export class ByteStream extends Stream {
  /**
   * @param {Source<Uint8Array>} source
   */
  static from(source) {
    return new ByteStream(toResource(source), {}, Direct)
  }

  reader() {
    return new BytesReader(this.getReader())
  }

  text() {
    return this.reader().text()
  }
  bytes() {
    return this.reader().bytes()
  }

  /**
   * @param {number} n
   */
  take(n = 1) {
    return toByteStream(take(this.getReader(), n).getReader())
  }
  /**
   * @param {number} size
   */
  chop(size) {
    return chop(this.getReader(), size)
  }

  /**
   * @param {number} byte
   */
  delimit(byte) {
    return delimit(this.getReader(), byte)
  }

  lines() {
    return this.delimit('\n'.charCodeAt(0))
  }
}

/**
 * @template T
 * @typedef {object} Resource
 * @property {() => Promise<ReadableStreamReadResult<T>>} read
 * @property {() => void} releaseLock
 * @property {(reason?: {}) => void} cancel
 */

/** @type {never[]} */
const EMPTY = []

/** @type {any[]} */
const OUT = []
/** @type {[any, any[]]} */
const STEP = [{}, OUT]

/**
 * @template {{}} T
 */
class Reader {
  /**
   * @param {Resource<T>} source
   */
  constructor(source) {
    this.source = source
  }
  read() {
    return this.source.read()
  }
  releaseLock() {
    return this.source.releaseLock()
  }

  /**
   * @param {{}} [reason]
   */
  cancel(reason) {
    const result = this.source.cancel(reason)
    this.source.releaseLock()
    return result
  }
  async *[Symbol.asyncIterator]() {
    while (true) {
      const { value, done } = await this.read()
      if (done) break
      yield value
    }
    this.cancel()
  }

  take(n = 1) {
    return take(this.source, n).reader()
  }

  collect() {
    return collect(this.source)
  }
}

/**
 * @extends {Reader<Uint8Array>}
 */
class BytesReader extends Reader {
  async bytes() {
    const chunks = []
    let length = 0
    for await (const chunk of this) {
      chunks.push(chunk)
      length += chunk.length
    }

    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }

    return bytes
  }
  async text() {
    return new TextDecoder().decode(await this.bytes())
  }

  take(n = 1) {
    return ByteStream.from(take(this.source, n)).reader()
  }
}
