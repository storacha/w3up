import * as API from '../src/types.js'

/**
 * @implements {API.StoreTable}
 * @implements {API.TestStoreTable}
 */
export class StoreTable {
  constructor() {
    /** @type {(API.StoreAddInput & API.StoreListItem)[]} */
    this.items = []
  }

  /**
   * @param {API.StoreAddInput} input
   * @returns
   */
  async insert({ space, issuer, invocation, ...output }) {
    this.items.unshift({
      space,
      issuer,
      invocation,
      ...output,
      insertedAt: new Date().toISOString(),
    })
    return output
  }

  /**
   *
   * @param {API.DID} space
   * @param {API.UnknownLink} link
   */
  async get(space, link) {
    return this.items.find(
      (item) => item.space === space && item.link.toString() === link.toString()
    )
  }

  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} link
   * @returns
   */
  async exists(space, link) {
    // eslint-disable-next-line yoda
    return null != (await this.get(space, link))
  }

  /**
   * @param {API.DID} space
   * @param {API.UnknownLink} link
   */
  async remove(space, link) {
    this.items = this.items.filter(
      (item) => item.space !== space && item.link.toString() !== link.toString()
    )
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
