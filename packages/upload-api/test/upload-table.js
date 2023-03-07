import * as API from '../src/types.js'

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
  async insert({ space, issuer, invocation, ...output }) {
    const time = new Date().toISOString()
    this.items.push({
      space,
      issuer,
      invocation,
      ...output,
      insertedAt: time,
      updatedAt: time,
    })
    return output
  }
  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} root
   */
  async remove(space, root) {
    this.items = this.items.filter(
      (item) => item.space !== space && item.root.toString() !== root.toString()
    )

    return undefined
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

    const first = matches[0]
    const last = matches[matches.length - 1]

    const start = String(first[0] || 0)
    const end = String(last[0] || 0)
    const values = matches.map(([_, item]) => item)

    const [before, after, results] = pre
      ? [end, start, values.reverse()]
      : [start, end, values]

    return {
      size: values.length,
      before,
      after,
      cursor: after,
      results,
    }
  }
}
