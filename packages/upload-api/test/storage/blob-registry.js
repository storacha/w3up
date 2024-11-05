import * as API from '../../src/types.js'
import { ok, error, Failure } from '@ucanto/core'
import { equals } from 'multiformats/bytes'

/** @implements {API.BlobAPI.Registry} */
export class Registry {
  constructor() {
    /** @type {Map<import('@storacha/access').SpaceDID, API.BlobAPI.Entry[]>} */
    this.data = new Map()
  }

  /** @type {API.BlobAPI.Registry['register']} */
  async register({ space, cause, blob }) {
    const entries = this.data.get(space) ?? []
    if (entries.some((e) => equals(e.blob.digest, blob.digest))) {
      return error(new EntryExists())
    }
    const insertedAt = new Date().toISOString()
    this.data.set(space, [{ blob, cause, insertedAt }, ...entries])
    return ok({})
  }

  /** @type {API.BlobAPI.Registry['find']} */
  async find(space, digest) {
    const entries = this.data.get(space) ?? []
    const entry = entries.find((e) => equals(e.blob.digest, digest.bytes))
    if (!entry) return error(new EntryNotFound())
    return ok(entry)
  }

  /** @type {API.BlobAPI.Registry['deregister']} */
  async deregister(space, digest) {
    const entries = this.data.get(space) ?? []
    const entry = entries.find((e) => equals(e.blob.digest, digest.bytes))
    if (!entry) return error(new EntryNotFound())
    this.data.set(
      space,
      entries.filter((e) => e !== entry)
    )
    return ok({})
  }

  /** @type {API.BlobAPI.Registry['entries']} */
  async entries(space, options) {
    const entries = this.data.get(space) ?? []
    const { cursor = '0', size = entries.length } = options ?? {}
    const offset = parseInt(cursor, 10)
    const items = entries.slice(offset)

    const matches = [...items.entries()].slice(0, size)

    if (matches.length === 0) {
      return ok({ size: 0, results: [] })
    }

    const first = matches[0]
    const last = matches[matches.length - 1]

    const start = first[0] || 0
    const end = last[0] || 0
    const values = matches.map(([_, item]) => item)

    const [before, after, results] = [
      `${start + offset}`,
      `${end + 1 + offset}`,
      values,
    ]

    return ok({
      size: values.length,
      before,
      after,
      cursor: after,
      results,
    })
  }
}

export class EntryNotFound extends Failure {
  static name = /** @type {const} */ ('EntryNotFound')

  get reason() {
    return this.message
  }

  get name() {
    return EntryNotFound.name
  }
}

export class EntryExists extends Failure {
  static name = /** @type {const} */ ('EntryExists')

  get reason() {
    return this.message
  }

  get name() {
    return EntryExists.name
  }
}
