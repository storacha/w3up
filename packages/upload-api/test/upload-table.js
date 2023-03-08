import * as API from '../src/types.js'
import { parseLink } from '@ucanto/core'

/**
 * @implements {API.UploadTable}
 */
export class UploadTable {
  constructor() {
    /** @type {(API.UploadListItem & API.UploadAddInput)[]} */
    this.items = []
  }

  /**
   * @param {API.UploadAddInput} input
   * @returns
   */
  async insert({ space, issuer, invocation, root, shards = [] }) {
    const time = new Date().toISOString()
    const item = this.items.find(
      (item) => item.space === space && item.root.toString() === root.toString()
    )

    if (item) {
      const next = new Set([
        ...(item.shards || []).map(String),
        ...shards.map(String),
      ])

      Object.assign(item, {
        shards: [...next].map(($) => parseLink($)),
        updatedAt: time,
      })

      return { root, shards: item.shards }
    } else {
      this.items.unshift({
        space,
        issuer,
        invocation,
        root,
        shards,
        insertedAt: time,
        updatedAt: time,
      })

      return { root, shards }
    }
  }

  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} root
   */
  async remove(space, root) {
    const item = this.items.find(
      (item) => item.space === space && item.root.toString() === root.toString()
    )

    if (item) {
      this.items.splice(this.items.indexOf(item), 1)
    }

    return item || null
  }

  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} root
   */
  async get(space, root) {
    return this.items.find(
      (item) => item.space === space && item.root.toString() === root.toString()
    )
  }

  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} link
   * @returns
   */
  async exists(space, link) {
    return null != (await this.get(space, link))
  }

  /**
   * @param {API.DID} space
   * @param {API.ListOptions} options
   */
  async list(
    space,
    { cursor = '0', pre = false, size = this.items.length } = {}
  ) {
    const offset = parseInt(cursor, 10)
    const items = pre ? this.items.slice(0, offset) : this.items.slice(offset)

    const matches = [...items.entries()]
      .filter(([n, item]) => item.space === space)
      .slice(0, size)

    if (matches.length === 0) {
      return {
        size: 0,
        results: [],
      }
    }

    const first = matches[0]
    const last = matches[matches.length - 1]

    const start = first[0] || 0
    const end = last[0] || 0
    const values = matches.map(([_, item]) => item)

    const [before, after, results] = pre
      ? [`${start}`, `${end + 1}`, values]
      : [`${start + offset}`, `${end + 1 + offset}`, values]

    return {
      size: values.length,
      before,
      after,
      cursor: after,
      results,
    }
  }
}
