import * as API from '../../src/types.js'
import { ok, error } from '@ucanto/core'
import { equals } from 'multiformats/bytes'
import { EntryExists, EntryNotFound } from '../../src/blob.js'

/** @implements {API.BlobAPI.Registry} */
export class Registry {
  constructor() {
    /** @type {Map<import('@storacha/access').SpaceDID, API.BlobAPI.Entry[]>} */
    this.data = new Map()
  }

  /** @type {API.BlobAPI.Registry['register']} */
  async register({ space, cause, blob }) {
    const entries = this.data.get(space) ?? []
    if (entries.some((e) => equals(e.blob.digest.bytes, blob.digest.bytes))) {
      return error(new EntryExists())
    }
    this.data.set(space, [{ blob, cause, insertedAt: new Date() }, ...entries])
    return ok({})
  }

  /** @type {API.BlobAPI.Registry['find']} */
  async find(space, digest) {
    const entries = this.data.get(space) ?? []
    const entry = entries.find((e) => equals(e.blob.digest.bytes, digest.bytes))
    if (!entry) return error(new EntryNotFound())
    return ok(entry)
  }

  /** @type {API.BlobAPI.Registry['deregister']} */
  async deregister({space, digest, cause}) {
    const entries = this.data.get(space) ?? []
    const entry = entries.find((e) => equals(e.blob.digest.bytes, digest.bytes))
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
