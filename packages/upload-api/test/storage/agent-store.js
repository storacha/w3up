import * as API from '../../src/types.js'
import { CAR, Invocation, Receipt } from '@ucanto/core'
import { RecordNotFound } from '../../src/errors.js'

export const memory = () => new AgentStore()

/**
 * @typedef {object} Model
 * @property {Record<string, CAR.Model>} store
 * @property {Record<string, {root: API.Link, at: string }[]>} index
 *
 * @implements {API.AgentStore}
 */
class AgentStore {
  /**
   * @param {Partial<Model>} [model]
   */
  constructor({
    store = Object.create(null),
    index = Object.create(null),
  } = {}) {
    const model = { store, index }
    this.model = model

    this.invocations = new InvocationLookup(model)
    this.receipts = new ReceiptLookup(model)
  }
  get messages() {
    return this
  }

  /**
   * @param {API.ParsedAgentMessage} message
   * @returns {Promise<API.Result<API.Unit, API.WriteError<API.ParsedAgentMessage>>>}
   */
  async write(message) {
    const { index, store } = this.model
    const at = message.data.root.cid.toString()
    store[at] = CAR.decode(message.source)

    for (const { invocation, receipt } of message.index) {
      if (invocation) {
        let entry = index[`/${invocation.task.toString()}/invocation/`] ?? []
        entry.push({ root: invocation.invocation.link(), at })
        index[`/${invocation.task.toString()}/invocation/`] = entry
      }

      if (receipt) {
        let entry = index[`/${receipt.task.toString()}/receipt/`] ?? []
        entry.push({ root: receipt.receipt.link(), at })
        index[`/${receipt.task.toString()}/receipt/`] = entry
      }
    }

    return { ok: {} }
  }
}

class InvocationLookup {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
  }
  /**
   *
   * @param {API.UnknownLink} key
   * @returns {Promise<API.Result<API.Invocation, API.RecordNotFound>>}
   */
  async get(key) {
    const { index, store } = this.model
    const record = index[`/${key.toString()}/invocation/`]?.[0]
    const archive = record ? store[record.at] : null
    const value = archive
      ? Invocation.view({ root: record.root, blocks: archive.blocks }, null)
      : null

    return value ? { ok: value } : { error: new RecordNotFound() }
  }
}

class ReceiptLookup {
  /**
   * @param {Model} model
   */
  constructor(model) {
    this.model = model
  }
  /**
   *
   * @param {API.UnknownLink} key
   * @returns {Promise<API.Result<API.Receipt, API.RecordNotFound>>}
   */
  async get(key) {
    const { index, store } = this.model
    const record = index[`/${key.toString()}/receipt/`]?.[0]
    const archive = record ? store[record.at] : null
    const value = archive
      ? Receipt.view({ root: record.root, blocks: archive.blocks }, null)
      : null

    return value ? { ok: value } : { error: new RecordNotFound() }
  }
}
